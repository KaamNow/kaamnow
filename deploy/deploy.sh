#!/usr/bin/env bash
# KaamNow — one-command deployment to a kind cluster on Ubuntu (Oracle Free Tier)
# Usage:
#   export LE_EMAIL="you@gmail.com"     # for Let's Encrypt
#   sudo bash deploy/deploy.sh
set -euo pipefail

# --- Config ---------------------------------------------------------------
CLUSTER_NAME="kaamnow"
LE_EMAIL="${LE_EMAIL:-admin@kaamnow.com}"
DOMAIN="kaamnow.com"
WWW_DOMAIN="www.kaamnow.com"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# --- Helpers --------------------------------------------------------------
green()  { printf "\e[32m%s\e[0m\n" "$*"; }
yellow() { printf "\e[33m%s\e[0m\n" "$*"; }
red()    { printf "\e[31m%s\e[0m\n" "$*"; }

require_root() {
  if [[ $EUID -ne 0 ]]; then
    red "Please run as root: sudo bash deploy/deploy.sh"
    exit 1
  fi
}

step() { echo; green "==> $*"; }

# --- Install Docker -------------------------------------------------------
install_docker() {
  if command -v docker &>/dev/null; then yellow "Docker already installed."; return; fi
  step "Installing Docker..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | tee /etc/apt/sources.list.d/docker.list >/dev/null
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
}

# --- Install kubectl + kind ----------------------------------------------
install_kubectl() {
  if command -v kubectl &>/dev/null; then yellow "kubectl already installed."; return; fi
  step "Installing kubectl..."
  curl -fsSLo /usr/local/bin/kubectl "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/$(dpkg --print-architecture)/kubectl"
  chmod +x /usr/local/bin/kubectl
}

install_kind() {
  if command -v kind &>/dev/null; then yellow "kind already installed."; return; fi
  step "Installing kind..."
  ARCH=$(dpkg --print-architecture)
  curl -fsSLo /usr/local/bin/kind "https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-${ARCH}"
  chmod +x /usr/local/bin/kind
}

# --- Open firewall ports --------------------------------------------------
configure_firewall() {
  step "Configuring firewall (ufw + iptables)..."
  if command -v ufw &>/dev/null; then
    ufw allow 80/tcp || true
    ufw allow 443/tcp || true
  fi
  # Oracle Linux iptables rules (Oracle's Ubuntu image has restrictive defaults)
  iptables -I INPUT -p tcp --dport 80 -j ACCEPT || true
  iptables -I INPUT -p tcp --dport 443 -j ACCEPT || true
  if command -v netfilter-persistent &>/dev/null; then
    netfilter-persistent save || true
  fi
  yellow "NOTE: Also open ports 80 + 443 in Oracle Cloud → Networking → Security Lists."
}

# --- Create kind cluster --------------------------------------------------
create_cluster() {
  if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    yellow "kind cluster '${CLUSTER_NAME}' already exists. Skipping."
    return
  fi
  step "Creating kind cluster..."
  kind create cluster --config "${SCRIPT_DIR}/kind-config.yaml" --wait 5m
  cp -f /root/.kube/config /root/.kube/config.kind 2>/dev/null || true
}

# --- Build and load images ------------------------------------------------
build_and_load_images() {
  step "Building backend image..."
  docker build -t kaamnow/backend:latest -f "${SCRIPT_DIR}/Dockerfile.backend" "${PROJECT_ROOT}"
  step "Building frontend image (this is the slow step)..."
  docker build \
    --build-arg REACT_APP_BACKEND_URL="" \
    -t kaamnow/frontend:latest \
    -f "${SCRIPT_DIR}/Dockerfile.frontend" "${PROJECT_ROOT}"

  step "Loading images into kind..."
  kind load docker-image kaamnow/backend:latest --name "${CLUSTER_NAME}"
  kind load docker-image kaamnow/frontend:latest --name "${CLUSTER_NAME}"
}

# --- Install NGINX Ingress + cert-manager ---------------------------------
install_ingress() {
  step "Installing NGINX Ingress Controller..."
  kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/kind/deploy.yaml
  step "Waiting for ingress controller to be ready..."
  kubectl wait --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=300s
}

install_cert_manager() {
  step "Installing cert-manager (Let's Encrypt)..."
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.15.3/cert-manager.yaml
  step "Waiting for cert-manager to be ready..."
  kubectl -n cert-manager wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager --timeout=300s
}

# --- Apply manifests ------------------------------------------------------
apply_manifests() {
  step "Generating JWT secret..."
  JWT_SECRET=$(openssl rand -hex 32)
  ADMIN_PASSWORD=$(openssl rand -base64 12)

  step "Applying namespace and core manifests..."
  kubectl apply -f "${SCRIPT_DIR}/k8s/00-namespace.yaml"
  kubectl apply -f "${SCRIPT_DIR}/k8s/10-mongodb.yaml"
  kubectl apply -f "${SCRIPT_DIR}/k8s/30-frontend.yaml"

  step "Creating backend secrets..."
  kubectl -n kaamnow create secret generic backend-secrets \
    --from-literal=JWT_SECRET="${JWT_SECRET}" \
    --from-literal=ADMIN_EMAIL="admin@kaamnow.com" \
    --from-literal=ADMIN_PASSWORD="${ADMIN_PASSWORD}" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl apply -f "${SCRIPT_DIR}/k8s/20-backend.yaml"

  step "Applying Let's Encrypt issuer..."
  sed "s/REPLACE_WITH_YOUR_EMAIL/${LE_EMAIL}/" "${SCRIPT_DIR}/k8s/40-issuer.yaml" | kubectl apply -f -

  step "Applying ingress..."
  kubectl apply -f "${SCRIPT_DIR}/k8s/50-ingress.yaml"

  echo
  green "================ DEPLOY DONE ================"
  green "Admin login (save this!):"
  echo "   email:    admin@kaamnow.com"
  echo "   password: ${ADMIN_PASSWORD}"
  echo
}

wait_for_pods() {
  step "Waiting for all pods in 'kaamnow' namespace to be ready..."
  kubectl -n kaamnow wait --for=condition=ready pod --all --timeout=600s || true
  kubectl -n kaamnow get pods
  kubectl -n kaamnow get ingress
  kubectl -n kaamnow get certificate || true
}

print_dns_instructions() {
  echo
  green "================ DNS — POINT GODADDY HERE ================"
  PUBLIC_IP=$(curl -s https://ipv4.icanhazip.com || hostname -I | awk '{print $1}')
  echo "Your server's public IP: ${PUBLIC_IP}"
  echo
  echo "Go to GoDaddy → My Products → kaamnow.com → DNS → Manage → Add records:"
  echo
  echo "  Type: A      Name: @     Value: ${PUBLIC_IP}    TTL: 600"
  echo "  Type: A      Name: www   Value: ${PUBLIC_IP}    TTL: 600"
  echo
  echo "After DNS propagates (1-5 minutes), Let's Encrypt will auto-issue HTTPS."
  echo "Verify with:"
  echo "  curl -I https://kaamnow.com"
  echo "  kubectl -n kaamnow describe certificate kaamnow-tls"
  echo
  green "Once DNS is live, your site will be available at: https://kaamnow.com"
}

main() {
  require_root
  install_docker
  install_kubectl
  install_kind
  configure_firewall
  create_cluster
  build_and_load_images
  install_ingress
  install_cert_manager
  apply_manifests
  wait_for_pods
  print_dns_instructions
}

main "$@"
