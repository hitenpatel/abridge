#!/usr/bin/env bash
# security-scan.sh — Dependency vulnerability scan for Abridge
#
# Runs:
#   1. pnpm audit        — built-in vulnerability check
#   2. Snyk              — CVE database scan with detailed reports (requires snyk CLI + auth)
#   3. npm audit (json)  — machine-readable output for CI
#
# Usage:
#   ./scripts/security-scan.sh              # interactive
#   ./scripts/security-scan.sh --ci         # CI mode: exits non-zero on any high/critical vuln
#
# Requirements:
#   - pnpm (available in PATH)
#   - snyk CLI (optional): npm install -g snyk && snyk auth

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$REPO_ROOT/security-reports"
DATE="$(date +%Y%m%d_%H%M%S)"
CI_MODE=false

# ── Parse args ────────────────────────────────────────────────────────────────
for arg in "$@"; do
    case "$arg" in
        --ci) CI_MODE=true ;;
    esac
done

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()     { echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}[pass]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC} $*"; }
fail()    { echo -e "${RED}[fail]${NC} $*"; }

OVERALL_EXIT=0

mkdir -p "$REPORT_DIR"
cd "$REPO_ROOT"

echo ""
echo -e "${BOLD}==================================================${NC}"
echo -e "${BOLD}  Abridge Security Scan — $(date '+%Y-%m-%d %H:%M')${NC}"
echo -e "${BOLD}==================================================${NC}"
echo ""

# ── 1. pnpm audit ─────────────────────────────────────────────────────────────
log "Running pnpm audit..."
PNPM_REPORT="$REPORT_DIR/pnpm-audit-${DATE}.txt"

if pnpm audit --audit-level=moderate 2>&1 | tee "$PNPM_REPORT"; then
    success "pnpm audit: no moderate+ vulnerabilities found."
else
    PNPM_EXIT=${PIPESTATUS[0]}
    warn "pnpm audit found vulnerabilities (exit $PNPM_EXIT). See: $PNPM_REPORT"
    if $CI_MODE; then
        OVERALL_EXIT=1
    fi
fi

echo ""

# ── 2. npm audit (JSON — machine readable) ────────────────────────────────────
log "Running npm audit (JSON output)..."
NPM_JSON_REPORT="$REPORT_DIR/npm-audit-${DATE}.json"

# pnpm can produce npm-compatible audit JSON
if pnpm audit --json > "$NPM_JSON_REPORT" 2>&1; then
    success "npm audit (JSON): no vulnerabilities. Report: $NPM_JSON_REPORT"
else
    warn "npm audit (JSON) found issues. Report: $NPM_JSON_REPORT"
    # Parse high/critical count
    if command -v node &>/dev/null && [[ -s "$NPM_JSON_REPORT" ]]; then
        HIGH_COUNT=$(node -e "
            try {
                const r = require('./$NPM_JSON_REPORT');
                const vulns = r.metadata?.vulnerabilities || {};
                console.log((vulns.high || 0) + (vulns.critical || 0));
            } catch(e) { console.log('unknown'); }
        " 2>/dev/null || echo "unknown")
        if [[ "$HIGH_COUNT" != "0" && "$HIGH_COUNT" != "unknown" ]]; then
            fail "High/critical vulnerabilities found: $HIGH_COUNT"
            if $CI_MODE; then OVERALL_EXIT=1; fi
        fi
    fi
fi

echo ""

# ── 3. Snyk (optional) ────────────────────────────────────────────────────────
if command -v snyk &>/dev/null; then
    log "Running Snyk scan..."
    SNYK_REPORT="$REPORT_DIR/snyk-${DATE}.json"

    if snyk test --all-projects --json > "$SNYK_REPORT" 2>&1; then
        success "Snyk: no vulnerabilities found."
    else
        SNYK_EXIT=$?
        if [[ $SNYK_EXIT -eq 1 ]]; then
            warn "Snyk found vulnerabilities. Report: $SNYK_REPORT"
            if $CI_MODE; then OVERALL_EXIT=1; fi
        else
            warn "Snyk exited with code $SNYK_EXIT (may need re-auth: snyk auth)"
        fi
    fi

    # Also run snyk monitor to track over time (non-blocking)
    if [[ "${SNYK_TOKEN:-}" != "" ]] || snyk whoami &>/dev/null 2>&1; then
        log "Running snyk monitor (tracks vulnerabilities over time)..."
        snyk monitor --all-projects &>/dev/null || warn "snyk monitor failed (non-blocking)"
    fi
else
    warn "snyk CLI not found — skipping Snyk scan."
    echo "       Install with: npm install -g snyk && snyk auth"
    echo "       See: https://snyk.io"
fi

echo ""

# ── 4. Summary ────────────────────────────────────────────────────────────────
echo -e "${BOLD}==================================================${NC}"
if [[ $OVERALL_EXIT -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}  All scans passed.${NC}"
else
    echo -e "${RED}${BOLD}  Some scans found issues — review reports above.${NC}"
fi
echo -e "${BOLD}==================================================${NC}"
echo ""
echo "Reports saved to: $REPORT_DIR"
echo ""
echo "Recommended next steps (see docs/INFRASTRUCTURE.md §1):"
echo "  - Run OWASP ZAP against staging:  zap-cli quick-scan http://your-staging-url"
echo "  - Check Mozilla Observatory:      npx observatory-cli app.abridge.school"
echo "  - Apply for Cyber Essentials:     https://www.ncsc.gov.uk/cyberessentials/overview"
echo ""

exit $OVERALL_EXIT
