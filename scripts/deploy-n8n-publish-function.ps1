# Deploy edge function n8n-publish-article (Windows / PowerShell)
# Requires SUPABASE_ACCESS_TOKEN in .env or environment.
# Get token: https://supabase.com/dashboard/account/tokens

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

function Get-DotEnvValue([string]$Name) {
    $line = Get-Content .env -ErrorAction SilentlyContinue | Where-Object { $_ -match "^\s*$Name=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return ($line -split '=', 2)[1].Trim()
}

$projectRef = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { 'ncolenbfdiukkyfixovo' }
$accessToken = $env:SUPABASE_ACCESS_TOKEN
if (-not $accessToken) { $accessToken = Get-DotEnvValue 'SUPABASE_ACCESS_TOKEN' }
if (-not $accessToken) {
    Write-Error "Missing SUPABASE_ACCESS_TOKEN. Add it to .env or run: npx supabase login --token YOUR_TOKEN"
}

$publishSecret = $env:N8N_PUBLISH_SECRET
if (-not $publishSecret) { $publishSecret = Get-DotEnvValue 'N8N_PUBLISH_SECRET' }
if (-not $publishSecret) {
    Write-Error "Missing N8N_PUBLISH_SECRET. Use the same value as NAS /opt/corehost/apps/n8n/.env"
}

$siteUrl = if ($env:SITE_URL) { $env:SITE_URL } else { Get-DotEnvValue 'SITE_URL' }
if (-not $siteUrl) { $siteUrl = 'https://bianconerihub.com' }

$env:SUPABASE_ACCESS_TOKEN = $accessToken

Write-Host "Setting Supabase secrets..."
npx supabase secrets set `
    "N8N_PUBLISH_SECRET=$publishSecret" `
    "SITE_URL=$siteUrl" `
    "N8N_DEFAULT_AUTHOR_EMAIL=admin@bianconerihub.com" `
    --project-ref $projectRef

Write-Host "Deploying n8n-publish-article..."
npx supabase functions deploy n8n-publish-article `
    --project-ref $projectRef `
    --no-verify-jwt `
    --use-api

Write-Host "Deployed n8n-publish-article to project $projectRef"
