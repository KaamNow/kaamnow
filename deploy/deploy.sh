#!/usr/bin/env bash
# KaamNow — one-command deployment to a kind cluster on Ubuntu 22.04
# Tested on AWS EC2 (t3.small/medium) and Oracle Cloud Free Tier ARM (Ampere A1).
#
# Usage:
#   sudo LE_EMAIL="you@gmail.com" bash deploy/deploy.sh
#
# What this script does (idempotent — safe to re-run):
#   1. Installs Docker, kubectl, kind (if missing)
#   2. Opens host firewall (ufw + iptables) for ports 80/443
#   3. Creates a single-node kind cluster with ports 80/443 mapped to host
#   4. Builds backend + frontend Docker images locally
#   5. Loads images directly into kind (no registry needed)
#   6. Installs NGINX Ingress Controller + cert-manager (Let's Encrypt)
#   7. Deploys MongoDB (StatefulSet + 2 GB PVC), backend, frontend
#   8. Creates Ingress with automatic HTTPS for kaamnow.com + www.kaamnow.com
#   9. Copies kubeconfig to the invoking user's home for non-root kubectl
set -euo pipefail

# --- Config ---------------------------------------------------------------
CLUSTER_NAME="kaamnow"
LE_EMAIL="${LE_EMAIL:-admin@kaamnow.com}"
KIND_VERSION="${KIND_VERSION:-v0.24.0}"
INGRESS_VERSION="${INGRESS_VERSION:-controller-v1.11.2}"
CERT_MANAGER_VERSION="${CERT_MANAGER_VERSION:-v1.15.3}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Helpers --------------------------------------------------------------
green()  { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }
red()    { printf "\e[31m%s\e[0m\n" "$*"; }
step()   { echo; green "==> $*"; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    red "Please run as root: sudo bash deploy/deploy.sh"
    exit 1
  fi
}

# --- Install Docker -------------------------------------------------------
install_docker() {
  if command -v docker &>/dev/null; then
    yellow "Docker already installed ($(docker --version))."
    return
  fi
  step "Installing Docker..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker

  # Allow the invoking user to run docker without sudo
  if [[ -n "${SUDO_USER:-}" ]]; then
    usermod -aG docker "$SUDO_USER" || true
  fi
}

# --- Install kubectl + kind ----------------------------------------------
install_kubectl() {
  if command -v kubectl &>/dev/null; then
    yellow "kubectl already installed ($(kubectl version --client --short 2>/dev/null || echo unknown))."
    return
  fi
  step "Installing kubectl..."
  local arch
  arch=$(dpkg --print-architecture)
  curl -fsSLo /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/${arch}/kubectl"
  chmod +x /usr/local/bin/kubectl
}

install_kind() {
  if command -v kind &>/dev/null; then
    yellow "kind already installed ($(kind version))."
    return
  fi
  step "Installing kind ${KIND_VERSION}..."
  local arch
  arch=$(dpkg --print-architecture)
  curl -fsSLo /usr/local/bin/kind \
    "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${arch}"
  chmod +x /usr/local/bin/kind
}

# --- Open firewall ports --------------------------------------------------
configure_firewall() {
  step "Configuring host firewall for ports 80/443..."
  if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
  fi
  iptables -C INPUT -p tcp --dport 80  -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport 80  -j ACCEPT || true
  iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null \
    || iptables -I INPUT -p tcp --dport 443 -j ACCEPT || true
  if command -v netfilter-persistent &>/dev/null; then
    netfilter-persistent save || true
  fi
  yellow "NOTE: Cloud firewall must also be opened:"
  yellow "  • AWS:    EC2 → Security Groups → Inbound rules → allow 80, 443 from 0.0.0.0/0"
  yellow "  • Oracle: Networking → VCN → Default Security List → ingress 80, 443 from 0.0.0.0/0"
}

# --- Create kind cluster --------------------------------------------------
create_cluster() {
  if kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
    yellow "kind cluster '${CLUSTER_NAME}' already exists. Skipping creation."
    return
  fi
  step "Creating kind cluster '${CLUSTER_NAME}'..."
  kind create cluster --config "${SCRIPT_DIR}/kind-config.yaml" --wait 5m
}

# --- Copy kubeconfig to invoking user ------------------------------------
fix_kubeconfig_ownership() {
  if [[ -z "${SUDO_USER:-}" ]] || [[ "$SUDO_USER" == "root" ]]; then
    return
  fi
  step "Copying kubeconfig to ~${SUDO_USER}/.kube/config..."
  local target_home
  target_home=$(getent passwd "$SUDO_USER" | cut -d: -f6)
  mkdir -p "${target_home}/.kube"
  cp -f /root/.kube/config "${target_home}/.kube/config"
  chown -R "${SUDO_USER}:${SUDO_USER}" "${target_home}/.kube"
  chmod 600 "${target_home}/.kube/config"
  yellow "User '${SUDO_USER}' can now run kubectl directly (no sudo needed)."
}

# --- Build and load images ------------------------------------------------
build_and_load_images() {
  step "Building backend image (kaamnow/backend:latest)..."
  docker build \
    -t kaamnow/backend:latest \
    -f "${SCRIPT_DIR}/Dockerfile.backend" \
    "${PROJECT_ROOT}"

  step "Building frontend image (kaamnow/frontend:latest) — slow on first run..."
  docker build \
    --build-arg REACT_APP_BACKEND_URL="" \
    -t kaamnow/frontend:latest \
    -f "${SCRIPT_DIR}/Dockerfile.frontend" \
    "${PROJECT_ROOT}"

  step "Loading images into kind cluster..."
  kind load docker-image kaamnow/backend:latest  --name "${CLUSTER_NAME}"
  kind load docker-image kaamnow/frontend:latest --name "${CLUSTER_NAME}"
}

# --- Install NGINX Ingress + cert-manager ---------------------------------
install_ingress() {
  step "Installing NGINX Ingress Controller (${INGRESS_VERSION})..."
  kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/${INGRESS_VERSION}/deploy/static/provider/kind/deploy.yaml"
  step "Waiting for ingress controller (up to 5 min)..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=300s
}

install_cert_manager() {
  step "Installing cert-manager (${CERT_MANAGER_VERSION})..."
  kubectl apply -f "https://github.com/cert-manager/cert-manager/releases/download/${CERT_MANAGER_VERSION}/cert-manager.yaml"
  step "Waiting for cert-manager pods..."
  kubectl -n cert-manager wait --for=condition=ready pod \
    -l app.kubernetes.io/instance=cert-manager --timeout=300s
}

# --- Apply manifests ------------------------------------------------------
apply_manifests() {
  step "Applying namespace + MongoDB + frontend manifests..."
  kubectl apply -f "${SCRIPT_DIR}/k8s/00-namespace.yaml"
  kubectl apply -f "${SCRIPT_DIR}/k8s/10-mongodb.yaml"
  kubectl apply -f "${SCRIPT_DIR}/k8s/30-frontend.yaml"

  # Idempotent secret: only generate fresh credentials on first deploy.
  if kubectl -n kaamnow get secret backend-secrets &>/dev/null; then
    yellow "Existing 'backend-secrets' found — keeping current JWT_SECRET and admin password."
    ADMIN_PASSWORD="(unchanged — see existing secret with: kubectl -n kaamnow get secret backend-secrets -o jsonpath='{.data.ADMIN_PASSWORD}' | base64 -d)"
  else
    step "Generating fresh JWT_SECRET + ADMIN_PASSWORD..."
    JWT_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 12)
    kubectl -n kaamnow create secret generic backend-secrets \
      --from-literal=JWT_SECRET="${JWT_SECRET}" \
      --from-literal=ADMIN_EMAIL="admin@kaamnow.com" \
      --from-literal=ADMIN_PASSWORD="${ADMIN_PASSWORD}"
  fi

  kubectl apply -f "${SCRIPT_DIR}/k8s/20-backend.yaml"

  step "Applying Let's Encrypt ClusterIssuer (email: ${LE_EMAIL})..."
  sed "s/REPLACE_WITH_YOUR_EMAIL/${LE_EMAIL}/" "${SCRIPT_DIR}/k8s/40-issuer.yaml" \
    | kubectl apply -f -

  step "Applying ingress..."
  kubectl apply -f "${SCRIPT_DIR}/k8s/50-ingress.yaml"

  step "Restarting backend/frontend deployments to pick up newly built images..."
  kubectl -n kaamnow rollout restart deployment/backend || true
  kubectl -n kaamnow rollout restart deployment/frontend || true

  echo
  green "================ DEPLOY DONE ================"
  green "Admin login:"
  echo "   email:    admin@kaamnow.com"
  echo "   password: ${ADMIN_PASSWORD}"
  echo
}

wait_for_pods() {
  step "Waiting for kaamnow pods to be ready (up to 10 min)..."
  kubectl -n kaamnow wait --for=condition=ready pod --all --timeout=600s || true
  echo
  green "--- Pods ---"
  kubectl -n kaamnow get pods
  green "--- Services ---"
  kubectl -n kaamnow get svc
  green "--- Ingress ---"
  kubectl -n kaamnow get ingress
  green "--- Certificate ---"
  kubectl -n kaamnow get certificate || true
}

print_dns_instructions() {
  echo
  green "================ POINT DNS HERE ================"
  PUBLIC_IP=$(curl -fsS https://ipv4.icanhazip.com 2>/dev/null \
    || curl -fsS https://api.ipify.org 2>/dev/null \
    || hostname -I | awk '{print $1}')
  echo "Server public IP: ${PUBLIC_IP}"
  echo
  echo "GoDaddy → kaamnow.com → DNS → Manage DNS → add records:"
  echo
  echo "  Type: A   Name: @     Value: ${PUBLIC_IP}   TTL: 600"
  echo "  Type: A   Name: www   Value: ${PUBLIC_IP}   TTL: 600"
  echo
  echo "After DNS propagates (1-5 min) Let's Encrypt will auto-issue HTTPS."
  echo "Watch the cert provision:"
  echo "  kubectl -n kaamnow describe certificate kaamnow-tls"
  echo
  echo "Verify with:"
  echo "  curl -I https://kaamnow.com"
  echo
  green "Site will be live at: https://kaamnow.com"
}

main() {
  require_root
  install_docker
  install_kubectl
  install_kind
  configure_firewall
  create_cluster
  fix_kubeconfig_ownership
  build_and_load_images
  install_ingress
  install_cert_manager
  apply_manifests
  wait_for_pods
  print_dns_instructions
}

main "$@"
