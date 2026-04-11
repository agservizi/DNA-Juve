#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${1:-}" || -z "${2:-}" ]]; then
  echo "Uso: $0 <webhook_url_pubblico> <webhook_secret>"
  echo "Esempio: $0 https://n8n.example.com/webhook/bianconerihub-instagram super-secret"
  exit 1
fi

WEBHOOK_URL="$1"
WEBHOOK_SECRET="$2"

supabase secrets set \
  N8N_INSTAGRAM_WEBHOOK_URL="$WEBHOOK_URL" \
  N8N_INSTAGRAM_WEBHOOK_SECRET="$WEBHOOK_SECRET"

supabase functions deploy instagram-publisher

echo "Secret Supabase aggiornati e funzione instagram-publisher ridistribuita."