#!/usr/bin/env bash
# deploy.sh — cache-bust and push to GitHub (Railway auto-deploys on push)
# Usage: bash deploy.sh "optional commit message"
#
# What it does:
#   1. Generates a new bundle name with a timestamp slug (e.g. index-v20260724.js)
#   2. Copies the current bundle to the new name
#   3. Updates dist/index.html to reference the new filenames
#   4. Removes the old bundle files so the repo stays clean
#   5. Commits and pushes — Railway redeploys automatically
#
# Cloudflare caches assets with max-age=31536000 immutable.
# Changing the filename forces every client to fetch fresh files immediately.

set -e

DIST="$(dirname "$0")/dist/assets"
HTML="$(dirname "$0")/dist/index.html"

# ── 1. Find current bundle names ──────────────────────────────────────────────
CURRENT_JS=$(ls "$DIST"/index-*.js 2>/dev/null | head -1)
CURRENT_CSS=$(ls "$DIST"/index-*.css 2>/dev/null | head -1)

if [ -z "$CURRENT_JS" ] || [ -z "$CURRENT_CSS" ]; then
  echo "ERROR: Could not find current bundle files in $DIST"
  exit 1
fi

CURRENT_JS_NAME=$(basename "$CURRENT_JS")
CURRENT_CSS_NAME=$(basename "$CURRENT_CSS")

# ── 2. Generate new names with timestamp ─────────────────────────────────────
STAMP=$(date +%Y%m%d%H%M)
NEW_JS_NAME="index-v${STAMP}.js"
NEW_CSS_NAME="index-v${STAMP}.css"

echo "Current JS:  $CURRENT_JS_NAME"
echo "Current CSS: $CURRENT_CSS_NAME"
echo "New JS:      $NEW_JS_NAME"
echo "New CSS:     $NEW_CSS_NAME"

# ── 3. Copy to new names ──────────────────────────────────────────────────────
cp "$DIST/$CURRENT_JS_NAME" "$DIST/$NEW_JS_NAME"
cp "$DIST/$CURRENT_CSS_NAME" "$DIST/$NEW_CSS_NAME"

# ── 4. Update index.html ──────────────────────────────────────────────────────
sed -i "s|/assets/$CURRENT_JS_NAME|/assets/$NEW_JS_NAME|g" "$HTML"
sed -i "s|/assets/$CURRENT_CSS_NAME|/assets/$NEW_CSS_NAME|g" "$HTML"
echo "Updated index.html"

# ── 5. Remove old bundle files (keep repo clean) ──────────────────────────────
if [ "$CURRENT_JS_NAME" != "$NEW_JS_NAME" ]; then
  git -C "$(dirname "$0")" rm --cached "dist/assets/$CURRENT_JS_NAME" 2>/dev/null || true
  rm -f "$DIST/$CURRENT_JS_NAME"
fi
if [ "$CURRENT_CSS_NAME" != "$NEW_CSS_NAME" ]; then
  git -C "$(dirname "$0")" rm --cached "dist/assets/$CURRENT_CSS_NAME" 2>/dev/null || true
  rm -f "$DIST/$CURRENT_CSS_NAME"
fi

# ── 6. Commit and push ────────────────────────────────────────────────────────
MSG="${1:-deploy: cache-bust bundle rename $STAMP}"
cd "$(dirname "$0")"
git add dist/assets/"$NEW_JS_NAME" dist/assets/"$NEW_CSS_NAME" dist/index.html
git commit -m "$MSG"
git push origin main

echo ""
echo "✓ Pushed. Railway will redeploy in ~2 minutes."
echo "  Live at: https://weather.bloodydaves.com"
