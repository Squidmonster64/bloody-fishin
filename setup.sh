#!/usr/bin/env bash
# ============================================================
# Bloody Dave's Fishing Planner — Local Setup Script
# Run with: bash setup.sh
# No manual .env editing required — all variables are baked in.
# ============================================================

set -e

echo "=============================================="
echo "  Bloody Dave's Fishing Planner — Local Setup"
echo "=============================================="
echo ""

# ── Environment Variables ──────────────────────────────────
# This app is a static React SPA that calls public APIs directly
# from the browser. No secret API keys are required.
# The only runtime variable is PORT (defaults to 3000).

export PORT="${PORT:-3000}"

# External APIs used (public, no auth required):
#   - https://api.open-meteo.com  (weather + marine forecast)
#   - https://marine-api.open-meteo.com  (wave/swell data)
#   - https://timeapi.io  (timezone lookup by coordinates)
# All API calls are made client-side — no backend proxy needed.

echo "Environment configured:"
echo "  PORT = $PORT"
echo ""

# ── Dependency Installation ────────────────────────────────
echo "Installing Node.js dependencies..."
if command -v npm &>/dev/null; then
    npm install --production
else
    echo "ERROR: npm not found. Please install Node.js >= 18."
    exit 1
fi
echo ""

# ── Start the Server ───────────────────────────────────────
echo "Starting Bloody Dave's Fishing Planner on port $PORT..."
echo "Open http://localhost:$PORT in your browser."
echo ""
node server.js
