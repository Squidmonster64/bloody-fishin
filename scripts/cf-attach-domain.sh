#!/usr/bin/env bash
# Step 3 (only after cf-verify passes): attach boating.bloodydaves.com to the Worker.
# This moves live traffic for that hostname from Railway to Cloudflare.
# Rollback: remove the custom domain in Cloudflare (Workers & Pages > bloody-fishin-staging >
# Settings > Domains) and re-point the DNS record to the Railway target.
set -euo pipefail
cd "$(dirname "$0")/.."
# Use npx to fetch the pinned pnpm when it is not installed (no sudo needed).
if ! command -v pnpm >/dev/null 2>&1; then pnpm() { npx --yes pnpm@10.4.1 "$@"; }; fi
: "${CLOUDFLARE_API_TOKEN:?Run: export CLOUDFLARE_API_TOKEN=<your token> first}"
read -r -p "Move boating.bloodydaves.com from Railway to Cloudflare now? (yes/no) " ans
[[ "$ans" == "yes" ]] || { echo "Cancelled."; exit 1; }
pnpm exec vite build
pnpm exec wrangler deploy --config wrangler.domain.jsonc
echo "Done. Check: curl -s https://boating.bloodydaves.com/health"
