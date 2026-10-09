# Railway deployment

The React client, Express API, health checks and native web bundle are built from this repository. Railway reads `railway.json`, runs the pinned pnpm build, and starts `node dist/index.js`.

## Environment boundary

- Existing production service: `bloody-fishin`, including `weather.bloodydaves.com`. Do not repoint, redeploy or replace it as part of staging work.
- Sprint 3 staging service: a separate Railway service built from `codex/sprint3-ios-readiness` and labelled with `APP_STAGE=staging`.
- Staging custom domain: `boating.bloodydaves.com`.
- The Capacitor app uses the staging origin by default; browser builds use their own origin.

## Required configuration

Railway supplies `PORT`. Set `APP_STAGE=staging` on the staging service. The core non-commercial beta needs no provider secret.

Optional commercial-provider configuration is server-only:

| Variable | Purpose |
|---|---|
| `OPEN_METEO_WEATHER_URL` | Commercial weather endpoint |
| `OPEN_METEO_MARINE_URL` | Commercial marine endpoint |
| `OPEN_METEO_GEOCODING_URL` | Commercial geocoding endpoint |
| `OPEN_METEO_API_KEY` | Commercial provider key |

Never expose a provider key through `VITE_*`. Open-Meteo's free endpoint is limited to qualifying non-commercial use and requires attribution; configure the appropriate commercial endpoint/licence before paid, ad-supported or other commercial distribution.

## Verification

After deployment, verify all of the following over HTTPS:

```text
GET /livez
GET /readyz
GET /health
GET /brief.json?spot=freo&days=5&hours=all
GET /
```

`/health` must report the intended stage, `/brief.json` must include `forecastHours`, and the app must render from the same deployment. Deployment completion also requires a read-only check that the production service and both existing production domains remain unchanged.

## Public forecast routes

| Route | Purpose |
|---|---|
| `/brief` | Plain-English Markdown forecast and qualifying windows |
| `/brief.json` | Structured forecast; add `hours=all` for complete local-day strips |
| `/locations?place=Broome` | Place-name resolution |
| `/mcp` | Stateless read-only MCP tools |

Personal spots remain device-local. The server receives coordinates only for the forecast request, does not persist them, and omits query strings from request logs.
