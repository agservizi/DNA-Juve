#!/usr/bin/env bash
set -euo pipefail

WEBHOOK_URL="${1:-}"
WEBHOOK_SECRET="${2:-}"

if [[ -z "$WEBHOOK_URL" || -z "$WEBHOOK_SECRET" ]]; then
  echo "Uso: $0 <webhook_url> <webhook_secret>"
  echo "Esempio: $0 https://bianconerihub-n8n.onrender.com/webhook/bianconerihub-instagram super-secret"
  exit 1
fi

supabase secrets set \
  N8N_INSTAGRAM_WEBHOOK_URL="$WEBHOOK_URL" \
  N8N_INSTAGRAM_WEBHOOK_SECRET="$WEBHOOK_SECRET"

supabase functions deploy instagram-publisher

echo "Supabase ora punta al webhook Render di n8n."