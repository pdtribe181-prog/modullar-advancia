#!/usr/bin/env bash
# health-check.sh — Check health of Advancia environments
# Usage: ./scripts/health-check.sh [staging|production|all]

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()      { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
fail()    { echo -e "${RED}[FAIL]${NC}  $*"; }

# ── Endpoints to check ────────────────────────────────────────────────────────
PROD_BASE="https://api.advanciapayledger.com"
STG_BASE="https://modullar-advancia-staging.onrender.com"
FRONTEND_URL="https://app.advanciapayledger.com"

TARGET="${1:-all}"
OVERALL_OK=0

# ── Check function ────────────────────────────────────────────────────────────
check_endpoint() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")

  if [[ "$status" == "$expected_status" ]]; then
    ok "[$label] $url → HTTP $status"
  else
    fail "[$label] $url → HTTP $status (expected $expected_status)"
    OVERALL_OK=1
  fi
}

check_json_field() {
  local label="$1"
  local url="$2"
  local field="$3"

  local body
  body=$(curl -sf --max-time 10 "$url" 2>/dev/null || echo '{}')
  local value
  value=$(echo "$body" | grep -o "\"$field\":[^,}]*" | head -1 || echo "")

  if [[ -n "$value" ]]; then
    ok "[$label] $field present in response"
  else
    warn "[$label] $field not found in response — may be non-critical"
  fi
}

# ── Run checks ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Advancia PayLedger — Health Check"
echo "  $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [[ "$TARGET" == "production" || "$TARGET" == "all" ]]; then
  info "─── Production ───────────────────────────────────────────"
  check_endpoint "PROD /health"   "${PROD_BASE}/health"
  check_endpoint "PROD /docs"     "${PROD_BASE}/docs"
  check_json_field "PROD health"  "${PROD_BASE}/health" "status"
  echo ""
fi

if [[ "$TARGET" == "staging" || "$TARGET" == "all" ]]; then
  info "─── Staging ──────────────────────────────────────────────"
  check_endpoint "STG /health"    "${STG_BASE}/health"
  check_endpoint "STG /docs"      "${STG_BASE}/docs"
  echo ""
fi

if [[ "$TARGET" == "all" ]]; then
  info "─── Frontend ─────────────────────────────────────────────"
  check_endpoint "Frontend"       "${FRONTEND_URL}" "200"
  echo ""
fi

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ $OVERALL_OK -eq 0 ]]; then
  echo -e "${GREEN}All checks passed ✅${NC}"
else
  echo -e "${RED}One or more checks FAILED ❌${NC}"
  exit 1
fi
