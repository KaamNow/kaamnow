#!/bin/bash
# KaamNow DEV deployment — isolated kind cluster "kaamnow-dev"
# Usage: sudo bash deploy/deploy-dev.sh [GIT_SHA]
# Target: totally separate from prod — different cluster name, namespace, ports
# Speed: ~2-3 minutes with Docker layer cache

set -euo pipefail

GIT_SHA="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo 'local')}"
CLUSTER_NAME="kaamnow-dev"
NAMESPACE="kaamnow-dev"
DEV_IMAGE_TAG="dev-${GIT_SHA}"
PORT_HTTP=9000       # dev runs on 9000 — prod stays on 80 (no conflict)
PORT_HTTPS=9443      # dev on 9443 — prod stays on 443 (no conflict)
KUBECONFIG_PATH="/root/.kube/kaamnow-dev.yaml"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "═══════════════════════════════════════════"
log "  KaamNow DEV Deploy — $DEV_IMAGE_TAG"
log "  Cluster: $CLUSTER_NAME (isolated)"
log "═══════════════════════════════════════════"

# ── Step 1: Install tools if needed (cached after first run) ──────────────────
if ! command -v docker &>/dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi

if ! command -v kind &>/dev/null; then
  log "Installing kind..."
  curl -Lo /usr/local/bin/kind \
    "https://kind.sigs.k8s.io/dl/v0.23.0/kind-linux-amd64"
  chmod +x /usr/local/bin/kind
fi

if ! command -v kubectl &>/dev/null; then
  log "Installing kubectl..."
  curl -Lo /usr/local/bin/kubectl \
    "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
  chmod +x /usr/local/bin/kubectl
fi

if ! command -v doppler &>/dev/null; then
  log "Installing Doppler..."
  curl -sLf --retry 3 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' \
    | gpg --dearmor -o /usr/share/keyrings/doppler-archive-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/doppler-archive-keyring.gpg] \
    https://packages.doppler.com/public/cli/deb/debian any-version main" \
    > /etc/apt/sources.list.d/doppler-cli.list
  apt-get update -q && apt-get install -q -y doppler
fi

# ── Step 2: Create DEV cluster if not exists ──────────────────────────────────
if ! kind get clusters 2>/dev/null | grep -q "^${CLUSTER_NAME}$"; then
  log "Creating isolated dev cluster: $CLUSTER_NAME..."
  cat <<EOF | kind create cluster --name "$CLUSTER_NAME" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 80
        hostPort: ${PORT_HTTP}
        protocol: TCP
      - containerPort: 443
        hostPort: ${PORT_HTTPS}
        protocol: TCP
EOF
  log "✅ Dev cluster created (ports ${PORT_HTTP}/${PORT_HTTPS})"
else
  log "✅ Dev cluster already exists"
fi

export KUBECONFIG=$(kind get kubeconfig-path --name "$CLUSTER_NAME" 2>/dev/null \
  || kind get kubeconfig --name "$CLUSTER_NAME" > "$KUBECONFIG_PATH" && echo "$KUBECONFIG_PATH")

# ── Step 3: Build Docker images (layer cache makes this fast) ─────────────────
log "Building backend image: kaamnow-backend:$DEV_IMAGE_TAG"
docker build \
  -f deploy/Dockerfile.backend \
  --cache-from kaamnow-backend:dev-latest \
  -t "kaamnow-backend:${DEV_IMAGE_TAG}" \
  -t kaamnow-backend:dev-latest \
  . 2>&1 | tail -3

log "Building frontend image: kaamnow-frontend:$DEV_IMAGE_TAG"
docker build \
  -f deploy/Dockerfile.frontend \
  --cache-from kaamnow-frontend:dev-latest \
  -t "kaamnow-frontend:${DEV_IMAGE_TAG}" \
  -t kaamnow-frontend:dev-latest \
  . 2>&1 | tail -3

# ── Step 4: Load images into dev cluster ──────────────────────────────────────
log "Loading images into dev cluster..."
kind load docker-image "kaamnow-backend:${DEV_IMAGE_TAG}" --name "$CLUSTER_NAME"
kind load docker-image "kaamnow-frontend:${DEV_IMAGE_TAG}" --name "$CLUSTER_NAME"

# ── Step 5: Install NGINX ingress (idempotent) ────────────────────────────────
if ! kubectl --kubeconfig "$KUBECONFIG_PATH" get ns ingress-nginx &>/dev/null 2>&1; then
  log "Installing NGINX Ingress..."
  kubectl --kubeconfig "$KUBECONFIG_PATH" apply \
    -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.2/deploy/static/provider/kind/deploy.yaml
  kubectl --kubeconfig "$KUBECONFIG_PATH" wait \
    --namespace ingress-nginx \
    --for=condition=ready pod \
    --selector=app.kubernetes.io/component=controller \
    --timeout=120s
  # Remove admission webhook — causes issues on kind (common fix)
  kubectl --kubeconfig "$KUBECONFIG_PATH" delete \
    -A ValidatingWebhookConfiguration ingress-nginx-admission \
    --ignore-not-found
  # Label control-plane node as ingress-ready (required for kind NGINX)
  kubectl --kubeconfig "$KUBECONFIG_PATH" label node \
    "${CLUSTER_NAME}-control-plane" ingress-ready=true --overwrite
fi

# ── Step 6: Apply dev manifests ───────────────────────────────────────────────
log "Applying dev k8s manifests..."
kubectl --kubeconfig "$KUBECONFIG_PATH" apply -f deploy/k8s/dev/00-namespace.yaml

# Sync secrets from Doppler → k8s Secret
log "Syncing secrets from Doppler..."
doppler secrets download \
  --token "$DOPPLER_TOKEN" \
  --project kaamnow \
  --config dev \
  --no-file \
  --format env \
  | kubectl --kubeconfig "$KUBECONFIG_PATH" \
    create secret generic backend-secrets \
    --namespace "$NAMESPACE" \
    --from-env-file=/dev/stdin \
    --dry-run=client -o yaml \
  | kubectl --kubeconfig "$KUBECONFIG_PATH" apply -f -

# Apply deployments with new image tag
sed "s|kaamnow-backend:latest|kaamnow-backend:${DEV_IMAGE_TAG}|g" \
  deploy/k8s/dev/20-backend.yaml \
  | kubectl --kubeconfig "$KUBECONFIG_PATH" apply -f -

sed "s|kaamnow-frontend:latest|kaamnow-frontend:${DEV_IMAGE_TAG}|g" \
  deploy/k8s/dev/30-frontend.yaml \
  | kubectl --kubeconfig "$KUBECONFIG_PATH" apply -f -

kubectl --kubeconfig "$KUBECONFIG_PATH" apply -f deploy/k8s/dev/50-ingress.yaml

# ── Step 7: Rollout and verify ────────────────────────────────────────────────
log "Rolling out..."
kubectl --kubeconfig "$KUBECONFIG_PATH" \
  rollout restart deployment/backend deployment/frontend \
  --namespace "$NAMESPACE"

kubectl --kubeconfig "$KUBECONFIG_PATH" \
  rollout status deployment/backend \
  --namespace "$NAMESPACE" \
  --timeout=90s

# ── Done ──────────────────────────────────────────────────────────────────────
SERVER_IP=$(curl -s ifconfig.me)
log "═══════════════════════════════════════════"
log "  ✅ DEV deployed in ~2-3 min!"
log "  API:      http://${SERVER_IP}:${PORT_HTTP}/api/stats"
log "  Tag:      $DEV_IMAGE_TAG"
log "  Cluster:  $CLUSTER_NAME (isolated from prod)"
log "═══════════════════════════════════════════"
