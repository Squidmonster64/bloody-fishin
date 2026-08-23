import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { briefMarkdown, buildBrief, resolveLocation } from "./briefing.js";
import { clientKey, consumeRateLimit, getCached, setCached } from "./ops.js";
import { READER_VERSION, prefersMachineReadable, renderIndexHtml, serveRoot } from "./spaShell.js";

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
      readerVersion: READER_VERSION,
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
      const message = error instanceof Error ? error.message : "Unable to build forecast brief.";
      const status = /timed out|temporarily unavailable|provider returned HTTP|fetch failed/i.test(message) ? 502 : 400;
      res.status(status).type("text/plain").send(message === "fetch failed" ? "Upstream weather/geocoding provider request failed." : message);
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
      const message = error instanceof Error ? error.message : "Unable to build forecast brief.";
      const status = /timed out|temporarily unavailable|provider returned HTTP|fetch failed/i.test(message) ? 502 : 400;
      res.status(status).json({
        error: message === "fetch failed" ? "Upstream weather/geocoding provider request failed." : message,
      });
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
    // Cloudflare prepends managed Disallow for GPTBot/ClaudeBot/etc.
    // Explicit Allow rules for the same user-agents override path-level access
    // for clients that use longest-match robots semantics (machine API paths only).
    const machinePaths = ["/brief", "/brief.json", "/locations", "/health", "/snapshot"];
    const aiAgents = [
      "GPTBot",
      "ChatGPT-User",
      "ClaudeBot",
      "anthropic-ai",
      "Claude-Web",
      "Bytespider",
      "CCBot",
      "Google-Extended",
      "Applebot-Extended",
      "Amazonbot",
      "meta-externalagent",
      "CloudflareBrowserRenderingCrawler",
      "PerplexityBot",
      "cohere-ai",
    ];
    const lines = [
      "User-agent: *",
      "Allow: /",
      ...machinePaths.map((p) => `Allow: ${p}`),
      "",
      "# Public read-only forecast API — intended for automated clients:",
      "# https://weather.bloodydaves.com/brief.json?place=Bali&days=5",
      "# https://weather.bloodydaves.com/brief?spot=freo&days=7",
      "# Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference",
      "",
    ];
    for (const agent of aiAgents) {
      lines.push(`User-agent: ${agent}`);
      for (const p of machinePaths) lines.push(`Allow: ${p}`);
      lines.push("");
    }
    res.type("text/plain").send(lines.join("\n"));
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.get("/", async (req, res) => {
    try {
      await serveRoot(req, res, staticPath);
    } catch {
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  app.use(express.static(staticPath, { index: false }));

  // Optional full HTML injection with live forecast snapshot
  app.get("/snapshot", async (req, res) => {
    try {
      const html = await renderIndexHtml(staticPath, true);
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Reader-Injected", "1");
      res.setHeader("X-Reader-Version", READER_VERSION);
      res.type("text/html; charset=utf-8").send(html);
    } catch {
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  // Handle client-side routing — bots get markdown, browsers get static shell
  app.get("*", async (req, res) => {
    try {
      if (prefersMachineReadable(req)) {
        await serveRoot(req, res, staticPath);
        return;
      }
      res.setHeader("X-Reader-Version", READER_VERSION);
      res.sendFile(path.join(staticPath, "index.html"));
    } catch {
      res.sendFile(path.join(staticPath, "index.html"));
    }
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
