#!/usr/bin/env bash
# deploy.sh — Deploy Advancia PayLedger to Hostinger VPS via SSH
# Usage: ./scripts/deploy.sh [staging|production] [commit-sha]
#
# Requires: ssh, VPS_SSH_HOST, VPS_SSH_USER, VPS_SSH_KEY_PATH (or ~/.ssh/id_rsa)

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warning() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Arguments ─────────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
COMMIT_SHA="${2:-$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  error "Unknown environment '$ENVIRONMENT'. Use: staging | production"
fi

# ── Config per environment ────────────────────────────────────────────────────
if [[ "$ENVIRONMENT" == "production" ]]; then
  VPS_PATH="/var/www/advancia"
  VPS_PM2="advancia-api"
  VPS_PORT="3000"
  GIT_BRANCH="main"
  APP_URL="https://api.advanciapayledger.com"
  MAX_RETRIES=15
  WAIT_SECONDS=30
else
  VPS_PATH="/var/www/advancia-staging"
  VPS_PM2="advancia-staging"
  VPS_PORT="3001"
  GIT_BRANCH="develop"
  APP_URL="https://api-staging.advanciapayledger.com"
  MAX_RETRIES=10
  WAIT_SECONDS=20
fi
HEALTH_URL="${APP_URL}/health"

VPS_HOST="${VPS_SSH_HOST:-}"
VPS_USER="${VPS_SSH_USER:-root}"
VPS_KEY="${VPS_SSH_KEY_PATH:-${HOME}/.ssh/id_rsa}"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Starting deploy → ${ENVIRONMENT} (commit: ${COMMIT_SHA})"

if [[ -z "$VPS_HOST" ]]; then
  error "VPS host not set. Export VPS_SSH_HOST."
fi

if [[ "$ENVIRONMENT" == "staging" ]]; then
  warning "Staging is not provisioned on the live VPS yet. Expected path: ${VPS_PATH}"
  error "Provision /var/www/advancia-staging and PM2 app advancia-staging before using staging deploys."
fi

if [[ "$ENVIRONMENT" == "production" ]]; then
  warning "Deploying to PRODUCTION. You have 10 seconds to abort (Ctrl+C)..."
  sleep 10
fi

# ── Deploy via SSH ────────────────────────────────────────────────────────────
info "Deploying to VPS ${VPS_HOST}${VPS_PATH} via SSH..."
ssh -i "$VPS_KEY" -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_HOST}" bash <<REMOTE
  set -e
  cd ${VPS_PATH}
  git fetch origin ${GIT_BRANCH}
  git reset --hard origin/${GIT_BRANCH}
  npm ci --omit=dev
  npm run build
  pm2 restart ${VPS_PM2} || pm2 start dist/server.js --name ${VPS_PM2} -- --port ${VPS_PORT}
REMOTE
success "SSH deployment completed"

# ── Wait for service to come up ───────────────────────────────────────────────
info "Waiting ${WAIT_SECONDS}s for service to start..."
sleep "$WAIT_SECONDS"

info "Running health checks (max $MAX_RETRIES attempts, 15s apart)..."
ATTEMPT=0
until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_RETRIES ]]; then
    error "Health check failed after $MAX_RETRIES attempts. Check VPS logs: ${VPS_HOST}${VPS_PATH}"
  fi
  info "Attempt $ATTEMPT/$MAX_RETRIES — not ready yet, waiting 15s..."
  sleep 15
done

# ── Post-deploy verification ──────────────────────────────────────────────────
success "Health check passed!"
info "Verifying API docs endpoint..."
DOCS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/docs" || echo "000")
if [[ "$DOCS_STATUS" == "200" ]]; then
  success "API docs reachable at ${APP_URL}/docs"
else
  warning "API docs returned HTTP $DOCS_STATUS (non-critical)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  Deploy to ${ENVIRONMENT} SUCCESSFUL${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  App URL   : ${APP_URL}"
echo "  Commit    : ${COMMIT_SHA}"
echo "  Timestamp : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""
