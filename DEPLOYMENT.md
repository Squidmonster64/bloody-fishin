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

## Public Forecast URLs

The Express app also exposes a keyless, LLM-readable briefing service:

| Route | Purpose |
|---|---|
| `/brief` | Plain-English Markdown forecast, qualifying windows, and the next 36 hours. |
| `/brief.json` | The same response as structured JSON. |
| `/locations?place=Broome` | Resolves a worldwide place name to coordinates. |
| `/mcp` | Remote **Model Context Protocol** (Streamable HTTP) read-only tools. |

### Remote MCP (ChatGPT / MCP clients)

Production URL:

```text
https://weather.bloodydaves.com/mcp
```

Transport: Streamable HTTP (stateless). Tools are read-only and reuse the same briefing/scoring authority as `/brief.json`.

| Tool | Purpose |
|---|---|
| `resolve_place` | Named place → coordinates |
| `get_forecast` | Structured weather/marine/fishing forecast |
| `find_windows` | Next continuous windows (e.g. wind ≤ 10 kt for 3 h) |

**Engineering check:** any independent MCP client can `initialize`, `tools/list`, and `tools/call` against that URL.

**ChatGPT product connection:** only if your ChatGPT plan exposes custom MCP / connector / app settings. When available, add a remote MCP server with URL `https://weather.bloodydaves.com/mcp` (no API key required for this public read-only service). Plan availability varies — successful `/mcp` engineering does not imply every ChatGPT account can attach custom MCP apps.

Use `spot=freo` or `spot=johnny` for built-in spots, `place=Fremantle%20WA` for worldwide name lookup, or `name=My%20Reef&lat=-32.06&lon=115.65` for a personal coordinate. Add `mode=wind&maxWind=5&minHours=3` to retrieve the next continuous three-hour wind window at or below five knots. These endpoints contain no private user spots and require no API key.
