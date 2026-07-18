# Bloody Dave's Fishing Planner

**SL20 Boating + Fishing Conditions · Powered by Open-Meteo**

A comprehensive fishing and boating conditions planner for Western Australia and beyond. Provides multi-day forecasts including wind, swell, tide, and a proprietary SL20 fishing score to help you plan the perfect day on the water.

---

## Features

- **Graph View** — Hourly wind, swell, tide, and fishing score charts
- **Summary View** — Daily summary cards with key conditions at a glance
- **Table View** — Full hourly data table for detailed planning
- **Sickie Forecast** — Find upcoming windows that meet your vessel's criteria
- **My Spots** — Save and manage your favourite fishing locations
- **Print View** — Print-friendly forecast for offline use
- **40+ Locations** — Perth Metro, Rottnest Island, Shark Bay, Mid-West Coast, and international spots

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS
- **Weather Data:** [Open-Meteo](https://open-meteo.com) (free, no API key required)
- **Marine Data:** [Open-Meteo Marine API](https://marine-api.open-meteo.com)
- **Timezone:** [TimeAPI.io](https://timeapi.io)
- **Server:** Node.js + Express (serves the static build)

---

## Local Development

Run the app locally with a single command — no manual configuration required:

```bash
bash setup.sh
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

**Requirements:** Node.js >= 18

---

## Railway Deployment

This project is configured for [Railway](https://railway.app) with Dockerfile-based builds.

### Steps to deploy:

1. Push this repo to GitHub (already done)
2. In the Railway dashboard, create a new project → **Deploy from GitHub repo**
3. Select `Squidmonster64/bloody-fishin`
4. Railway will auto-detect the `railway.toml` and use the Dockerfile
5. No environment variables are required (all APIs are public)
6. Once deployed, add your custom domain `bloodydaves.com` in Railway's domain settings

### Custom Domain (bloodydaves.com)

After the Railway service is live:

1. In Railway: **Settings → Networking → Custom Domain** → add `bloodydaves.com` and `www.bloodydaves.com`
2. Railway will provide CNAME/A records
3. In your DNS provider (e.g., Cloudflare, Namecheap), point:
   - `bloodydaves.com` → Railway's provided value (A record or CNAME)
   - `www.bloodydaves.com` → Railway's provided value (CNAME)
4. SSL is handled automatically by Railway

---

## Project Structure

```
bloody-fishin/
├── dist/                    # Pre-built production assets (committed)
│   ├── index.html           # SPA entry point
│   ├── favicon.ico
│   ├── robots.txt
│   └── assets/
│       ├── index-*.js       # Bundled React application
│       └── index-*.css      # Compiled styles
├── server.js                # Express server (serves dist/)
├── package.json
├── Dockerfile               # Railway/Docker build config
├── railway.toml             # Railway deployment config
├── setup.sh                 # One-command local setup script
└── README.md
```

---

## API Usage

All API calls are made **client-side** directly from the browser — no backend proxy or API keys are required:

| API | Purpose | Auth |
|-----|---------|------|
| `api.open-meteo.com` | Wind, temperature, UV, precipitation | None |
| `marine-api.open-meteo.com` | Wave height, swell, tide | None |
| `timeapi.io` | Timezone lookup by coordinates | None |

---

## Credits

Built with [Manus](https://manus.im). Weather data courtesy of [Open-Meteo](https://open-meteo.com).
