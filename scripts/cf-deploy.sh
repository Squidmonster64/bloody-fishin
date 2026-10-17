#!/usr/bin/env bash
# Step 1: build and deploy the Worker to its workers.dev URL. Does NOT touch any custom domain.
# Usage:  export CLOUDFLARE_API_TOKEN=...   (token stays in your own terminal)
#         ./scripts/cf-deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
# Use npx to fetch the pinned pnpm when it is not installed (no sudo needed).
if ! command -v pnpm >/dev/null 2>&1; then pnpm() { npx --yes pnpm@10.4.1 "$@"; }; fi
: "${CLOUDFLARE_API_TOKEN:?Run: export CLOUDFLARE_API_TOKEN=<your token> first}"
command -v node >/dev/null || { echo "Node 22+ is required (https://nodejs.org)"; exit 1; }
true
pnpm install --frozen-lockfile
pnpm exec vite build
pnpm exec wrangler whoami
pnpm exec wrangler deploy
echo
echo "Next: ./scripts/cf-verify.sh https://bloody-fishin-staging.<your-subdomain>.workers.dev"
