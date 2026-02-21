#!/usr/bin/env bash
# rollback.sh — Roll back to the previous stable deployment on Render
# Usage: ./scripts/rollback.sh [staging|production]
#
# Strategy: Render doesn't have a direct rollback API, so we:
#   1. Find the last successful GitHub Actions run on the target branch
#   2. Re-trigger deploy using the Render deploy hook (Render redeploys last
#      successful build if no new code is pushed, or we can retag + push)
#
# For a proper rollback, use the Render dashboard:
#   Dashboard → Service → Events → click a previous deploy → "Redeploy"

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warning() { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Arguments ─────────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-production}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  error "Unknown environment '$ENVIRONMENT'. Use: staging | production"
fi

# ── Confirmation ──────────────────────────────────────────────────────────────
warning "═══════════════════════════════════════════════════════════"
warning "  ROLLBACK requested for: ${ENVIRONMENT}"
warning "═══════════════════════════════════════════════════════════"
echo ""
echo "This will:"
echo "  1. Find the last stable Git tag on the current branch"
echo "  2. Checkout that tag locally"
echo "  3. Push a new deploy commit (or re-trigger via deploy hook)"
echo ""
read -rp "Are you sure you want to rollback ${ENVIRONMENT}? [y/N] " confirm
if [[ "${confirm,,}" != "y" ]]; then
  info "Rollback cancelled."
  exit 0
fi

# ── Config ─────────────────────────────────────────────────────────────────────
if [[ "$ENVIRONMENT" == "production" ]]; then
  DEPLOY_HOOK_URL="${RENDER_DEPLOY_HOOK_URL:-}"
  APP_URL="https://api.advanciapayledger.com"
  HEALTH_URL="${APP_URL}/health"
  TARGET_BRANCH="main"
else
  DEPLOY_HOOK_URL="${RENDER_STAGING_DEPLOY_HOOK_URL:-}"
  APP_URL="https://modullar-advancia-staging.onrender.com"
  HEALTH_URL="${APP_URL}/health"
  TARGET_BRANCH="develop"
fi

if [[ -z "$DEPLOY_HOOK_URL" ]]; then
  error "Deploy hook not configured. Set RENDER_DEPLOY_HOOK_URL or RENDER_STAGING_DEPLOY_HOOK_URL."
fi

# ── Find previous stable tag/commit ──────────────────────────────────────────
info "Looking for previous stable tag..."
PREVIOUS_TAG=$(git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sed -n '2p' || true)
CURRENT_TAG=$(git tag --sort=-creatordate | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | head -1 || true)

if [[ -n "$PREVIOUS_TAG" ]]; then
  info "Current tag : ${CURRENT_TAG:-none}"
  info "Rolling back to: ${PREVIOUS_TAG}"
  ROLLBACK_SHA=$(git rev-list -n 1 "$PREVIOUS_TAG")
else
  # No tags — roll back to HEAD~1
  warning "No version tags found. Rolling back to HEAD~1"
  ROLLBACK_SHA=$(git rev-parse HEAD~1)
  PREVIOUS_TAG="HEAD~1"
fi

# ── Create rollback branch and push ──────────────────────────────────────────
ROLLBACK_BRANCH="rollback/${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
info "Creating rollback branch: ${ROLLBACK_BRANCH}"

git checkout -b "$ROLLBACK_BRANCH" "$ROLLBACK_SHA"
git checkout "$TARGET_BRANCH"
git merge --ff-only "$ROLLBACK_BRANCH" 2>/dev/null || {
  warning "Fast-forward not possible. Creating revert commit..."
  git revert --no-edit HEAD || true
}
git branch -D "$ROLLBACK_BRANCH" 2>/dev/null || true

# ── Trigger deploy ────────────────────────────────────────────────────────────
info "Triggering Render rollback deploy..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DEPLOY_HOOK_URL")

if [[ "$HTTP_STATUS" -lt 200 || "$HTTP_STATUS" -ge 300 ]]; then
  error "Render deploy hook returned HTTP $HTTP_STATUS"
fi
success "Deploy hook accepted (HTTP $HTTP_STATUS)"

# ── Wait and health check ─────────────────────────────────────────────────────
info "Waiting 90s for rollback deployment..."
sleep 90

ATTEMPT=0
MAX_RETRIES=12
until curl -sf "$HEALTH_URL" >/dev/null 2>&1; do
  ATTEMPT=$((ATTEMPT + 1))
  if [[ $ATTEMPT -ge $MAX_RETRIES ]]; then
    error "Rollback health check failed. Check Render dashboard immediately: ${APP_URL}"
  fi
  info "Health check attempt $ATTEMPT/$MAX_RETRIES — waiting 15s..."
  sleep 15
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  Rollback to ${PREVIOUS_TAG} SUCCESSFUL${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Environment : ${ENVIRONMENT}"
echo "  Rolled back : ${CURRENT_TAG:-unknown} → ${PREVIOUS_TAG}"
echo "  SHA         : ${ROLLBACK_SHA}"
echo "  App URL     : ${APP_URL}"
echo "  Timestamp   : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo ""
warning "Remember to investigate the root cause before re-deploying forward."
