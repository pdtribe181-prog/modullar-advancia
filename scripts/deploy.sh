#!/usr/bin/env bash
# deploy.sh — Deploy Advancia PayLedger to a target environment
# Usage: ./scripts/deploy.sh [staging|production] [commit-sha]
#
# Requires: curl, Environment variables set (see .env or GitHub secrets)

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
  DEPLOY_HOOK_URL="${RENDER_DEPLOY_HOOK_URL:-}"
  APP_URL="https://api.advanciapayledger.com"
  HEALTH_URL="${APP_URL}/health"
  MAX_RETRIES=15
  WAIT_SECONDS=90
else
  DEPLOY_HOOK_URL="${RENDER_STAGING_DEPLOY_HOOK_URL:-}"
  APP_URL="https://modullar-advancia-staging.onrender.com"
  HEALTH_URL="${APP_URL}/health"
  MAX_RETRIES=10
  WAIT_SECONDS=60
fi

# ── Pre-flight checks ─────────────────────────────────────────────────────────
info "Starting deploy → ${ENVIRONMENT} (commit: ${COMMIT_SHA})"

if [[ -z "$DEPLOY_HOOK_URL" ]]; then
  error "Deploy hook URL not set. Export RENDER_DEPLOY_HOOK_URL or RENDER_STAGING_DEPLOY_HOOK_URL."
fi

if [[ "$ENVIRONMENT" == "production" ]]; then
  warning "Deploying to PRODUCTION. You have 10 seconds to abort (Ctrl+C)..."
  sleep 10
fi

# ── Trigger deploy ────────────────────────────────────────────────────────────
info "Triggering Render deploy..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_HOOK_URL")

if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  error "Deploy hook returned HTTP $HTTP_STATUS"
fi
success "Deploy hook accepted (HTTP $HTTP_STATUS)"

# ── Wait for service to come up ───────────────────────────────────────────────
info "Waiting ${WAIT_SECONDS}s for Render to start deployment..."
sleep "$WAIT_SECONDS"

info "Running health checks (max $MAX_RETRIES attempts, 20s apart)..."
ATTEMPT=0
until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_RETRIES ]]; then
    error "Health check failed after $MAX_RETRIES attempts. Check Render logs: ${APP_URL}"
  fi
  info "Attempt $ATTEMPT/$MAX_RETRIES — not ready yet, waiting 20s..."
  sleep 20
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
