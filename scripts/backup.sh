#!/usr/bin/env bash
# backup.sh — Daily PostgreSQL backup with optional Cloudflare R2 upload
#
# Usage:
#   ./scripts/backup.sh              # manual run
#   Cron (daily at 2am):
#     0 2 * * * /path/to/abridge/scripts/backup.sh >> /var/log/abridge-backup.log 2>&1
#
# Requires:
#   - docker / docker compose (for pg_dump via container)
#   - aws CLI (optional, for R2 upload): brew install awscli
#
# Environment variables (read from .env in repo root if present):
#   POSTGRES_USER, POSTGRES_DB, POSTGRES_PASSWORD
#   BACKUP_DIR         — local directory to store dumps (default: /opt/abridge/backups)
#   BACKUP_R2_*        — R2 credentials for offsite upload (optional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env if present (won't fail if missing)
if [[ -f "$REPO_ROOT/.env" ]]; then
    set -o allexport
    # shellcheck disable=SC1091
    source "$REPO_ROOT/.env"
    set +o allexport
fi

# ── Config ────────────────────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-/opt/abridge/backups}"
POSTGRES_USER="${POSTGRES_USER:-abridge}"
POSTGRES_DB="${POSTGRES_DB:-abridge}"
COMPOSE_FILE="$REPO_ROOT/docker-compose.prod.yml"
DATE="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/abridge-db-${DATE}.sql.gz"
RETENTION_DAYS=30

# R2 config (optional)
R2_ACCOUNT_ID="${BACKUP_R2_ACCOUNT_ID:-${R2_ACCOUNT_ID:-}}"
R2_ACCESS_KEY_ID="${BACKUP_R2_ACCESS_KEY_ID:-${R2_ACCESS_KEY_ID:-}}"
R2_SECRET_ACCESS_KEY="${BACKUP_R2_SECRET_ACCESS_KEY:-${R2_SECRET_ACCESS_KEY:-}}"
R2_BUCKET_NAME="${BACKUP_R2_BUCKET_NAME:-abridge-backups}"

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# ── Prepare backup directory ──────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
log "Backup directory: $BACKUP_DIR"

# ── Dump database ─────────────────────────────────────────────────────────────
log "Starting pg_dump for database: $POSTGRES_DB"

if docker compose -f "$COMPOSE_FILE" ps db --status running &>/dev/null 2>&1; then
    # Running via docker compose
    docker compose -f "$COMPOSE_FILE" exec -T db \
        pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
elif docker ps --format '{{.Names}}' | grep -q "abridge.*db\|db.*abridge"; then
    # Standalone docker container
    CONTAINER=$(docker ps --format '{{.Names}}' | grep -E "abridge.*db|db.*abridge" | head -1)
    docker exec "$CONTAINER" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_FILE"
else
    log "ERROR: Could not find running database container."
    exit 1
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Dump complete: $BACKUP_FILE ($BACKUP_SIZE)"

# ── Upload to Cloudflare R2 (optional) ────────────────────────────────────────
if [[ -n "$R2_ACCOUNT_ID" && -n "$R2_ACCESS_KEY_ID" && -n "$R2_SECRET_ACCESS_KEY" ]]; then
    if command -v aws &>/dev/null; then
        log "Uploading to R2 bucket: $R2_BUCKET_NAME"
        AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
        AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
        aws s3 cp "$BACKUP_FILE" "s3://${R2_BUCKET_NAME}/$(basename "$BACKUP_FILE")" \
            --endpoint-url "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com" \
            --no-progress
        log "Upload complete."
    else
        log "WARN: aws CLI not found — skipping R2 upload. Install with: brew install awscli"
    fi
else
    log "R2 credentials not configured — skipping offsite upload (local backup only)."
fi

# ── Prune old local backups ────────────────────────────────────────────────────
log "Removing local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "abridge-db-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "abridge-db-*.sql.gz" | wc -l | tr -d ' ')
log "Local backups retained: $REMAINING"

# ── Done ──────────────────────────────────────────────────────────────────────
log "Backup finished successfully: $(basename "$BACKUP_FILE")"
