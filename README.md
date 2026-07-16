# 🎣 Bloody Dave's Fishing Planner

> *"If he looks like me all the better."*

A production-grade fishing and boating conditions planner for serious anglers. Combines SL20 boating safety ratings with solunar fishing scores, moon phases, tides, and a **Sickie Forecast** — so you always know the perfect excuse to call in sick.

![Bloody Dave's Fishing Planner](https://d2xsxph8kpxj0f.cloudfront.net/310519663684424569/Zf3NoHKqXnmETZGgVva2ZL/bloody_dave_logo-SGaET4JxvYRo7MAjVdoiG8.webp)

---

## Features

| Feature | Description |
|---|---|
| **SL20 Ratings** | Excellent / Go / Marginal / Avoid — based on wind speed and effective swell height |
| **Hourly Fishing %** | Solunar-based score combining moon phase, moon transit, solar events, tide rate, and wind |
| **Zoomable Charts** | Chart.js with pinch-to-zoom, scroll-to-zoom, and drag-to-pan |
| **Sickie Forecast** | Dedicated tab listing all upcoming windows where SL20 ≥ Go AND fishing ≥ 4★ |
| **Moon Phases** | Phase name, emoji, illumination %, and transit/underfoot times |
| **Tide Extremes** | Detected from hourly sea level data |
| **International** | Works anywhere in the world — auto-detects timezone from lat/lon |
| **Saved Spots** | Pre-loaded with Fremantle Offshore, Johnny Big Boy (Shark Bay), and 30+ locations |
| **Custom Lat/Lon** | Manual coordinate entry for any location worldwide |
| **iPhone SE Optimised** | Responsive down to 375px — all touch targets ≥ 44px |

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **Charts**: Chart.js 4 + chartjs-plugin-zoom + Hammer.js (touch)
- **Data**: [Open-Meteo](https://open-meteo.com/) (weather + marine) — **free, no API key**
- **Timezone**: [TimeAPI.io](https://timeapi.io/) — **free, no API key**
- **Server**: Express (serves static build in production)
- **Package Manager**: pnpm

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8

### Local Development

```bash
# Clone
git clone https://github.com/your-username/bloody-daves-fishing-planner.git
cd bloody-daves-fishing-planner

# Install dependencies (verify this succeeds from a clean clone)
pnpm install

# Start dev server
pnpm dev
# → http://localhost:3000
```

### Production Build

```bash
# Verify build succeeds from a clean clone
pnpm install --frozen-lockfile
pnpm build

# Start production server
pnpm start
```

---

## Environment Variables

Copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: 3000). Railway injects this automatically. |
| `NODE_ENV` | No | Set to `production` in deployment. |
| `VITE_ANALYTICS_ENDPOINT` | No | Umami analytics endpoint (leave blank to disable). |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Umami website ID. |

**No API keys are required.** Open-Meteo and TimeAPI.io are both free and keyless.

---

## Deploy to Railway

### One-click via GitHub

1. Push this repo to GitHub.
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
3. Select your repository.
4. Railway auto-detects the `railway.json` config and runs:
   - **Build**: `pnpm install --frozen-lockfile && pnpm build`
   - **Start**: `node dist/index.js`
5. Set any optional environment variables in the Railway dashboard → **Variables**.
6. Done — Railway provides a public URL automatically.

### Manual Railway CLI

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

---

## Project Structure

```
bloody-daves-fishing-planner/
├── client/
│   ├── index.html
│   └── src/
│       ├── components/
│       │   ├── Controls.tsx       # Location/days selector + custom lat/lon
│       │   ├── ErrorState.tsx
│       │   ├── GraphView.tsx      # Chart.js with zoom/pan
│       │   ├── Header.tsx         # Bloody Dave logo + title
│       │   ├── LoadingState.tsx
│       │   ├── SickieView.tsx     # Sickie Forecast tab
│       │   ├── SummaryView.tsx    # Daily cards with hourly strips
│       │   ├── TabBar.tsx
│       │   └── TableView.tsx      # Frozen-column hourly table
│       ├── hooks/
│       │   └── useFishingData.ts  # App state + data loading
│       ├── lib/
│       │   └── fishingEngine.ts   # SL20, fishing score, moon, tides, API
│       └── pages/
│           └── Home.tsx
├── server/
│   └── index.ts                   # Express static server
├── .env.example
├── railway.json                   # Railway deployment config
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## SL20 Rating System

| Rating | Wind | Effective Swell | Colour |
|---|---|---|---|
| **Excellent** | ≤ 8kt | ≤ 0.5m | 🟢 Green |
| **Go** | ≤ 15kt | ≤ 1.0m | 🟢 Green |
| **Marginal** | ≤ 20kt | ≤ 1.5m | 🟡 Amber |
| **Avoid** | > 20kt | > 1.5m | 🔴 Red |

Effective swell is adjusted for swell period — long-period swells (≥ 14s) are less dangerous than short-period chop.

---

## Fishing Score

The hourly fishing percentage (0–100%) is calculated from:

- **Moon phase** (new/full moon = +20 pts)
- **Moon transit / underfoot** (within 30 min = +22 pts)
- **Solar events** (sunrise/sunset within 30 min = +15 pts)
- **Tide rate of change** (fast moving tide = +12 pts)
- **Wind speed** (calm to moderate = bonus; strong = penalty)
- **Rain probability** (high rain = small penalty)

Stars: 5★ ≥ 82%, 4★ ≥ 70%, 3★ ≥ 55%, 2★ ≥ 40%, 1★ < 40%.

---

## Sickie Forecast

A "Sickie" is any window where **SL20 is Go or better** AND **fishing is 4★ or higher**. The Sickie Forecast tab groups consecutive golden hours into windows and lists them chronologically — so you can plan your "sick days" weeks in advance.

---

## Licence

MIT — go fish.
