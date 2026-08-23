import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { briefMarkdown, buildBrief, resolveLocation } from "./briefing.js";
import { clientKey, consumeRateLimit, getCached, setCached } from "./ops.js";
import { renderIndexHtml, serveRoot } from "./spaShell.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRIEF_TTL_MS = Number(process.env.BRIEF_CACHE_TTL_MS ?? 5 * 60_000);
const BRIEF_RATE_LIMIT = Number(process.env.BRIEF_RATE_LIMIT ?? 30);

function briefCacheKey(req: express.Request): string {
  const q = req.query as Record<string, unknown>;
  const keys = Object.keys(q).sort();
  return keys.map(k => `${k}=${String(q[k])}`).join("&");
}

function applyRateLimit(req: express.Request, res: express.Response): boolean {
  const result = consumeRateLimit(`brief:${clientKey(req)}`, BRIEF_RATE_LIMIT);
  res.setHeader("X-RateLimit-Limit", String(BRIEF_RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).type("text/plain").send("Rate limit exceeded. Try again shortly.");
    return false;
  }
  return true;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "bloody-fishin",
      stage: "beta",
      ts: new Date().toISOString(),
    });
  });

  app.get("/brief", async (req, res) => {
    try {
      if (!applyRateLimit(req, res)) return;
      const key = `md:${briefCacheKey(req)}`;
      const cached = getCached<string>(key);
      if (cached) {
        res.setHeader("X-Brief-Cache", "HIT");
        res.type("text/markdown; charset=utf-8").send(cached);
        return;
      }
      const brief = await buildBrief(req);
      const md = briefMarkdown(brief);
      setCached(key, md, BRIEF_TTL_MS);
      res.setHeader("X-Brief-Cache", "MISS");
      res.type("text/markdown; charset=utf-8").send(md);
    } catch (error) {
      res.status(400).type("text/plain").send(error instanceof Error ? error.message : "Unable to build forecast brief.");
    }
  });

  app.get("/brief.json", async (req, res) => {
    try {
      if (!applyRateLimit(req, res)) return;
      const key = `json:${briefCacheKey(req)}`;
      const cached = getCached<unknown>(key);
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (cached) {
        res.setHeader("X-Brief-Cache", "HIT");
        res.json(cached);
        return;
      }
      const brief = await buildBrief(req);
      setCached(key, brief, BRIEF_TTL_MS);
      res.setHeader("X-Brief-Cache", "MISS");
      res.json(brief);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unable to build forecast brief." });
    }
  });

  app.get("/locations", async (req, res) => {
    try {
      if (!applyRateLimit(req, res)) return;
      const location = await resolveLocation(req.query);
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(location);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Unable to resolve location." });
    }
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(
      [
        "User-agent: *",
        "Allow: /",
        "Allow: /brief",
        "Allow: /brief.json",
        "Allow: /locations",
        "Allow: /health",
        "",
        "# Machine-readable forecast (no JavaScript required):",
        "# https://weather.bloodydaves.com/brief?spot=freo&days=7",
        "# https://weather.bloodydaves.com/brief.json?spot=freo&days=7",
      ].join("\n"),
    );
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.get("/", async (req, res, next) => {
    try {
      await serveRoot(req, res, staticPath);
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(staticPath, { index: false }));

  // Handle client-side routing - serve index.html with embedded reader snapshot
  app.get("*", async (req, res, next) => {
    try {
      const html = await renderIndexHtml(staticPath, true);
      res.type("text/html; charset=utf-8").send(html);
    } catch (error) {
      next(error);
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
