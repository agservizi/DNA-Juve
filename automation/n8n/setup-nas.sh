#!/usr/bin/env bash
set -euo pipefail
N8N_DIR="/opt/corehost/apps/n8n"
ENV_FILE="$N8N_DIR/.env"
COMPOSE_FILE="$N8N_DIR/docker-compose.yml"
WORKFLOW_SRC="/tmp/bianconerihub-publish-articles.json"
SUPABASE_PROJECT_URL="${SUPABASE_URL:-https://ncolenbfdiukkyfixovo.supabase.co}"

upsert_env() {
  local key="$1"
  local value="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

ensure_compose_env_block() {
  if grep -q 'SUPABASE_URL:' "$COMPOSE_FILE"; then
    return
  fi

  awk '
    /^      COREGIT_URL:/ {
      print
      print ""
      print "      # BianconeriHub automation"
      print "      SUPABASE_URL: ${SUPABASE_URL}"
      print "      SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY}"
      print "      N8N_PUBLISH_SECRET: ${N8N_PUBLISH_SECRET}"
      print "      GROQ_API_KEY: ${GROQ_API_KEY}"
      next
    }
    { print }
  ' "$COMPOSE_FILE" > "${COMPOSE_FILE}.tmp" && mv "${COMPOSE_FILE}.tmp" "$COMPOSE_FILE"
}

echo "[setup] BianconeriHub n8n automation"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

if ! grep -q '^N8N_PUBLISH_SECRET=' "$ENV_FILE"; then
  SECRET="$(openssl rand -hex 32)"
  upsert_env "N8N_PUBLISH_SECRET" "$SECRET"
  echo "[setup] Generated N8N_PUBLISH_SECRET"
else
  echo "[setup] N8N_PUBLISH_SECRET already present"
fi

upsert_env "SUPABASE_URL" "$SUPABASE_PROJECT_URL"

if ! grep -q '^SUPABASE_ANON_KEY=' "$ENV_FILE"; then
  upsert_env "SUPABASE_ANON_KEY" "REPLACE_WITH_SUPABASE_ANON_KEY"
  echo "[setup] Added SUPABASE_ANON_KEY placeholder — update $ENV_FILE"
fi

if ! grep -q '^GROQ_API_KEY=' "$ENV_FILE"; then
  upsert_env "GROQ_API_KEY" "REPLACE_WITH_GROQ_API_KEY"
  echo "[setup] Added GROQ_API_KEY placeholder — update $ENV_FILE"
fi

ensure_compose_env_block

echo "[setup] Restarting n8n stack"
cd "$N8N_DIR"
docker compose up -d

if [[ -f "$WORKFLOW_SRC" ]]; then
  echo "[setup] Importing workflow"
  docker cp "$WORKFLOW_SRC" n8n:/tmp/bianconerihub-publish-articles.json
  docker exec n8n n8n import:workflow --input=/tmp/bianconerihub-publish-articles.json || true
fi

echo "[setup] Done."
echo "[setup] Next: set SUPABASE_ANON_KEY and GROQ_API_KEY in $ENV_FILE, then:"
echo "  cd $N8N_DIR && docker compose up -d"
echo "[setup] Deploy Supabase function with the same N8N_PUBLISH_SECRET:"
echo "  npx supabase secrets set N8N_PUBLISH_SECRET=... --project-ref ncolenbfdiukkyfixovo"
echo "  npx supabase functions deploy n8n-publish-article --project-ref ncolenbfdiukkyfixovo"
