# Independent Railway Deployment

This repository is self-contained and can be deployed from GitHub to Railway without a Manus account, runtime, asset host, API proxy, analytics endpoint, or secret.

## What Railway Needs

Railway reads `railway.json` and runs `pnpm install --frozen-lockfile && pnpm build`, followed by `node dist/index.js`. It supplies the `PORT` environment variable automatically. No additional variables or API keys are required for the planner's core weather, marine, timezone, chart, cache, comparison, sharing, printing, or calendar functionality.

## Deploy

1. In Railway, choose **New Project → Deploy from GitHub Repo**.
2. Select `Squidmonster64/bloody-fishin` and its `main` branch.
3. Confirm Railway detects `railway.json`.
4. In the Railway service's **Settings → Networking → Custom Domain**, attach `weather.bloodydaves.com`.
5. Update the DNS record at the domain provider using the value Railway displays, replacing the old Railway-domain mapping if necessary.

The only live data providers are the public, keyless Open-Meteo weather and marine APIs plus TimeAPI.io for timezone lookup. The planner remains usable with its last successful forecast stored locally in the browser if a live request fails.
