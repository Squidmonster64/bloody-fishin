const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// 1. Gzip compression — applied before all routes
//    Skips already-compressed content (images etc) automatically
app.use(compression());

// 2. Static asset caching — tiered strategy
//    Vite-hashed bundles (/assets/*) — cache 1 year, immutable
//    (filename changes whenever content changes, so this is safe)
app.use('/assets', express.static(path.join(distPath, 'assets'), {
  etag: true,
  lastModified: true,
  maxAge: '1y',
  immutable: true,
}));

//    Everything else (index.html, favicon, robots.txt) — 5 min cache with revalidation
//    Short TTL so updates propagate quickly
app.use(express.static(distPath, {
  etag: true,
  lastModified: true,
  maxAge: '5m',
}));

// 3. Health check — no-store so Railway's probe always hits the live server
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', app: "Bloody Dave's Fishing Planner" });
});

// SPA fallback — serve index.html for all non-asset routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bloody Dave's Fishing Planner running on port ${PORT}`);
});
