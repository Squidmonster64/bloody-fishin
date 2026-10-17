# Cloudflare Workers deployment

`worker/index.ts` serves the same routes as the Express server (`server/index.ts`) on
Cloudflare Workers, with the built client served from the `ASSETS` binding. The forecast
logic (`server/briefing.ts`, `officialMarine.ts`, `ops.ts`) and MCP tools
(`server/mcpServer.ts`) are shared. Railway remains the rollback until cutover is proven.

## Commands

```bash
pnpm cf:dry      # build + bundle check, no deploy
pnpm cf:dev      # local Worker on :8787
pnpm cf:deploy   # build + deploy (needs `wrangler login` or CLOUDFLARE_API_TOKEN)
```

`wrangler.jsonc` deploys the staging Worker (`bloody-fishin-staging`, `APP_STAGE=staging`,
`workers.dev` URL). No secrets are required. Optional Open-Meteo commercial settings go in
`wrangler secret put OPEN_METEO_API_KEY` and `vars` (`OPEN_METEO_*_URL`).

## Cutover

1. Deploy, then check `/health`, `/brief.json?spot=freo&days=5&hours=all`, `/mcp`, and `/`.
2. Check CPU time on `/brief.json` in the Workers dashboard (free plan limit is 10 ms/request).
3. Attach `boating.bloodydaves.com` with `scripts/cf-attach-domain.sh` (uses `wrangler.domain.jsonc`).
4. Later: move `weather.` and `www.` the same way, set `VITE_API_ORIGIN` for the iOS build, retire Railway.

## Known differences from Express

- Rate limit and cache are per-isolate memory (best effort), not shared globally.
- Client IP comes from `CF-Connecting-IP`.
- `worker/reader.ts` duplicates `server/spaShell.ts` reader logic without Node `fs`; keep in step until Railway is retired.

## Scripts

`scripts/cf-deploy.sh` (build + deploy to workers.dev), `scripts/cf-verify.sh <url>` (smoke test
and timings), `scripts/cf-attach-domain.sh` (custom domain, asks for confirmation). Each reads
`CLOUDFLARE_API_TOKEN` from the environment; the token is never written to disk.
