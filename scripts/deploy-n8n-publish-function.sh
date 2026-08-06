#!/usr/bin/env bash
# Deploy edge function n8n-publish-article to Supabase.
# Requires: npx supabase + supabase login OR SUPABASE_ACCESS_TOKEN env var.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT_REF="${SUPABASE_PROJECT_REF:-ncolenbfdiukkyfixovo}"

cd "$ROOT_DIR"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "Run: npx supabase login"
  echo "Or export SUPABASE_ACCESS_TOKEN before running this script."
fi

if [[ -z "${N8N_PUBLISH_SECRET:-}" ]]; then
  N8N_PUBLISH_SECRET="$(openssl rand -hex 32)"
  echo "Generated N8N_PUBLISH_SECRET (save it for n8n .env):"
  echo "$N8N_PUBLISH_SECRET"
fi

npx supabase secrets set \
  N8N_PUBLISH_SECRET="$N8N_PUBLISH_SECRET" \
  SITE_URL="${SITE_URL:-https://bianconerihub.com}" \
  --project-ref "$PROJECT_REF"

npx supabase functions deploy n8n-publish-article --project-ref "$PROJECT_REF"

echo "Deployed n8n-publish-article to project $PROJECT_REF"
