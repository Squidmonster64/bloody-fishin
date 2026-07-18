const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1d',
  etag: true,
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', app: "Bloody Dave's Fishing Planner" });
});

// SPA fallback - serve index.html for all non-asset routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bloody Dave's Fishing Planner running on port ${PORT}`);
});
