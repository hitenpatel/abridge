#!/usr/bin/env bash
# setup-production.sh — First-time production deployment for Abridge
#
# Usage: ./scripts/setup-production.sh
# Run from the monorepo root.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
ENV_FILE="$REPO_ROOT/.env"
ENV_EXAMPLE="$REPO_ROOT/.env.production.example"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[info]${NC}  $*"; }
success() { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
error()   { echo -e "${RED}[error]${NC} $*" >&2; }

# ── Prerequisites ─────────────────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
    error "docker is not installed. See https://docs.docker.com/get-docker/"
    exit 1
fi
success "docker $(docker --version | awk '{print $3}' | tr -d ',')"

if ! docker compose version &>/dev/null; then
    error "docker compose (v2) is not available. Update Docker or install the plugin."
    exit 1
fi
success "docker compose $(docker compose version --short)"

# ── Environment file ──────────────────────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
    info "No .env found — copying from $ENV_EXAMPLE"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    warn ".env created from template. You MUST fill in the required values below."
fi

# ── Prompt for required values if still placeholders ─────────────────────────
prompt_if_empty() {
    local key="$1"
    local description="$2"
    local current
    current=$(grep -E "^${key}=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true)

    if [[ -z "$current" || "$current" == *"<"* || "$current" == *"changeme"* || "$current" == *"CHANGE_ME"* ]]; then
        echo -e "${YELLOW}${BOLD}${key}${NC}: ${description}"
        read -rp "  Enter value: " value
        if [[ -z "$value" ]]; then
            error "${key} cannot be empty."
            exit 1
        fi
        # Replace or append the value
        if grep -qE "^${key}=" "$ENV_FILE"; then
            sed -i.bak "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            echo "${key}=${value}" >> "$ENV_FILE"
        fi
        success "${key} set."
    else
        success "${key} already configured."
    fi
}

echo ""
echo -e "${BOLD}=== Required environment variables ===${NC}"
echo ""

prompt_if_empty "POSTGRES_USER"     "PostgreSQL username (e.g. abridge)"
prompt_if_empty "POSTGRES_PASSWORD" "PostgreSQL password (generate a strong one)"
prompt_if_empty "POSTGRES_DB"       "PostgreSQL database name (e.g. abridge)"
prompt_if_empty "BETTER_AUTH_SECRET" "Auth session secret — run: openssl rand -base64 48"
prompt_if_empty "SETUP_KEY"         "Secret key for initial school registration (e.g. your-school-setup-key)"
prompt_if_empty "WEB_URL"           "Web app URL (e.g. https://app.abridge.school)"
prompt_if_empty "NEXT_PUBLIC_API_URL" "API URL (e.g. https://api.abridge.school)"
prompt_if_empty "BETTER_AUTH_URL"   "API URL used by auth (same as NEXT_PUBLIC_API_URL)"

echo ""

# ── Build and start services ──────────────────────────────────────────────────
info "Building Docker images (this may take a few minutes on first run)..."
docker compose -f "$COMPOSE_FILE" build

info "Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

info "Waiting for database to be ready..."
for i in $(seq 1 30); do
    if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -q 2>/dev/null; then
        success "Database is ready."
        break
    fi
    if [[ $i -eq 30 ]]; then
        error "Database did not become ready in time. Check: docker compose -f docker-compose.prod.yml logs db"
        exit 1
    fi
    echo -n "."
    sleep 2
done

# ── Run migrations ────────────────────────────────────────────────────────────
info "Running database migrations..."
docker compose -f "$COMPOSE_FILE" exec -T api \
    sh -c 'cd /app/packages/db && npx prisma migrate deploy'
success "Migrations complete."

# ── Seed database ─────────────────────────────────────────────────────────────
echo ""
read -rp "Seed the database with initial data? [y/N] " seed_confirm
if [[ "$seed_confirm" =~ ^[Yy]$ ]]; then
    info "Running seed script..."
    docker compose -f "$COMPOSE_FILE" exec -T api \
        sh -c 'cd /app/packages/db && npx tsx prisma/seed.ts'
    success "Seed complete."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
WEB_URL_VAL=$(grep -E "^WEB_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || echo "https://app.abridge.school")
API_URL_VAL=$(grep -E "^NEXT_PUBLIC_API_URL=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || echo "https://api.abridge.school")

echo ""
echo -e "${GREEN}${BOLD}=====================================================${NC}"
echo -e "${GREEN}${BOLD}  Abridge is deployed!${NC}"
echo -e "${GREEN}${BOLD}=====================================================${NC}"
echo ""
echo -e "  Web app:  ${CYAN}${WEB_URL_VAL}${NC}"
echo -e "  API:      ${CYAN}${API_URL_VAL}${NC}"
echo -e "  API docs: ${CYAN}${API_URL_VAL}/api/docs${NC}"
echo ""
echo -e "  ${BOLD}Useful commands:${NC}"
echo -e "    docker compose -f docker-compose.prod.yml ps"
echo -e "    docker compose -f docker-compose.prod.yml logs -f api"
echo -e "    docker compose -f docker-compose.prod.yml logs -f web"
echo ""
echo -e "  ${YELLOW}Next steps:${NC}"
echo -e "    1. Ensure DNS A records point ${WEB_URL_VAL} and ${API_URL_VAL} to this server"
echo -e "    2. Caddy will automatically obtain TLS certificates"
echo -e "    3. Set up the daily backup cron: crontab -e"
echo -e "       Add: 0 2 * * * $(pwd)/scripts/backup.sh"
echo ""
