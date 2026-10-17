/**
 * Cloudflare Worker entry for Bloody Dave's Fishing Planner.
 * Same routes and briefing authority as server/index.ts (Express), without Node HTTP.
 * Static files are served from the ASSETS binding (dist/public).
 */
import { briefMarkdown, buildBrief, resolveLocation } from "../server/briefing.js";
import { getOfficialMarine } from "../server/officialMarine.js";
import { consumeRateLimit, getCached, setCached } from "../server/ops.js";
import { MCP_RATE_LIMIT, MCP_SERVER_VERSION } from "../server/mcpServer.js";
import { robotsTxt } from "../server/robots.js";
import { handleMcp } from "./mcp.js";
import { READER_VERSION, prefersMachineReadable, renderIndexHtml, serveRoot } from "./reader.js";

export interface Env {
  ASSETS: { fetch(input: Request | string, init?: RequestInit): Promise<Response> };
}

type BriefReq = Parameters<typeof buildBrief>[0];
type LocQuery = Parameters<typeof resolveLocation>[0];

const BRIEF_TTL_MS = Number(process.env.BRIEF_CACHE_TTL_MS ?? 5 * 60_000);
const BRIEF_RATE_LIMIT = Number(process.env.BRIEF_RATE_LIMIT ?? 30);
const FORECAST_VERSION = "2026-09-26-marine-v2";
const BAD_UPSTREAM = /timed out|temporarily unavailable|provider returned HTTP|fetch failed/i;

const MCP_CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
};

function stage(): string {
  return process.env.APP_STAGE ?? "production";
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function text(body: string, status = 200, type = "text/plain; charset=utf-8", headers: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { "content-type": type, ...headers } });
}

function cacheKey(query: Record<string, string>): string {
  return Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join("&");
}

function clientId(request: Request): string {
  // Cloudflare sets CF-Connecting-IP at the edge; it cannot be spoofed by the client.
  return request.headers.get("cf-connecting-ip") || "unknown";
}

/** Returns a 429 Response when over the limit, else rate-limit headers to attach. */
function rateLimit(request: Request, bucket: string, limit: number): { blocked: Response | null; headers: Record<string, string> } {
  const result = consumeRateLimit(`${bucket}:${clientId(request)}`, limit);
  const headers: Record<string, string> = {
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(result.remaining),
  };
  if (result.allowed) return { blocked: null, headers };
  headers["retry-after"] = String(result.retryAfterSec);
  return { blocked: text("Rate limit exceeded. Try again shortly.", 429, "text/plain; charset=utf-8", headers), headers };
}

async function assetIndex(env: Env, request: Request): Promise<string | null> {
  try {
    const res = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
    return res.ok ? await res.text() : null;
  } catch {
    return null;
  }
}

async function spaShell(env: Env, request: Request): Promise<Response> {
  const res = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
  const out = new Response(res.body, { status: res.ok ? 200 : 404, headers: res.headers });
  out.headers.set("x-reader-version", READER_VERSION);
  return out;
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const query = Object.fromEntries(url.searchParams.entries());
  const method = request.method;

  if (path === "/mcp") {
    if (method === "OPTIONS") return new Response(null, { status: 204, headers: MCP_CORS });
    const rl = rateLimit(request, "mcp", MCP_RATE_LIMIT);
    if (rl.blocked) return json({ error: "Rate limit exceeded. Try again shortly." }, 429, { ...rl.headers, ...MCP_CORS });
    const res = await handleMcp(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries({ ...MCP_CORS, ...rl.headers })) out.headers.set(k, v);
    return out;
  }

  if (method !== "GET" && method !== "HEAD") return text("Method not allowed", 405, "text/plain; charset=utf-8", { allow: "GET, HEAD" });

  switch (path) {
    case "/livez":
      return json({ ok: true }, 200, { "cache-control": "no-store" });

    case "/readyz": {
      const index = await env.ASSETS.fetch(new Request(new URL("/index.html", request.url)));
      return index.ok
        ? json({ ok: true, stage: stage() }, 200, { "cache-control": "no-store" })
        : json({ ok: false, error: "static build unavailable" }, 503, { "cache-control": "no-store" });
    }

    case "/health":
      return json(
        {
          ok: true,
          service: "bloody-fishin",
          stage: stage(),
          runtime: "cloudflare-workers",
          readerVersion: READER_VERSION,
          forecastVersion: FORECAST_VERSION,
          commit: process.env.GIT_COMMIT_SHA ?? null,
          mcp: { path: "/mcp", version: MCP_SERVER_VERSION, transport: "streamable-http" },
          ts: new Date().toISOString(),
        },
        200,
        { "cache-control": "no-store" },
      );

    case "/official-marine": {
      const rl = rateLimit(request, "brief", BRIEF_RATE_LIMIT);
      if (rl.blocked) return rl.blocked;
      const lat = Number(query.lat);
      const lon = Number(query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return json({ error: "Valid latitude and longitude required" }, 400, rl.headers);
      }
      return json(await getOfficialMarine(lat, lon), 200, rl.headers);
    }

    case "/brief": {
      try {
        const rl = rateLimit(request, "brief", BRIEF_RATE_LIMIT);
        if (rl.blocked) return rl.blocked;
        const key = `md:${cacheKey(query)}`;
        const headers = { ...rl.headers, "cache-control": "public, max-age=60, stale-while-revalidate=300" };
        const cached = getCached<string>(key);
        if (cached) return text(cached, 200, "text/markdown; charset=utf-8", { ...headers, "x-brief-cache": "HIT" });
        const md = briefMarkdown(await buildBrief({ query } as unknown as BriefReq));
        setCached(key, md, BRIEF_TTL_MS);
        return text(md, 200, "text/markdown; charset=utf-8", { ...headers, "x-brief-cache": "MISS" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to build forecast brief.";
        return text(
          message === "fetch failed" ? "Upstream weather/geocoding provider request failed." : message,
          BAD_UPSTREAM.test(message) ? 502 : 400,
        );
      }
    }

    case "/brief.json": {
      try {
        const rl = rateLimit(request, "brief", BRIEF_RATE_LIMIT);
        if (rl.blocked) return rl.blocked;
        const key = `json:${cacheKey(query)}`;
        const headers = {
          ...rl.headers,
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=60, stale-while-revalidate=300",
        };
        const cached = getCached<unknown>(key);
        if (cached) return json(cached, 200, { ...headers, "x-brief-cache": "HIT" });
        const brief = await buildBrief({ query } as unknown as BriefReq);
        setCached(key, brief, BRIEF_TTL_MS);
        return json(brief, 200, { ...headers, "x-brief-cache": "MISS" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to build forecast brief.";
        return json(
          { error: message === "fetch failed" ? "Upstream weather/geocoding provider request failed." : message },
          BAD_UPSTREAM.test(message) ? 502 : 400,
          { "access-control-allow-origin": "*" },
        );
      }
    }

    case "/locations": {
      try {
        const rl = rateLimit(request, "brief", BRIEF_RATE_LIMIT);
        if (rl.blocked) return rl.blocked;
        const location = await resolveLocation(query as unknown as LocQuery);
        return json(location, 200, {
          ...rl.headers,
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=300, stale-while-revalidate=1800",
        });
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : "Unable to resolve location." }, 400);
      }
    }

    case "/robots.txt":
      return text(robotsTxt(), 200, "text/plain; charset=utf-8", { "cache-control": "no-store" });

    case "/snapshot": {
      const html = await renderIndexHtml(await assetIndex(env, request), true);
      return text(html, 200, "text/html; charset=utf-8", {
        "cache-control": "no-store",
        "x-reader-injected": "1",
        "x-reader-version": READER_VERSION,
      });
    }

    case "/": {
      try {
        const machine = await serveRoot(request.headers, query);
        if (machine) return machine;
      } catch {
        /* fall through to the static shell */
      }
      return spaShell(env, request);
    }
  }

  // Static files first (manifest, icons, service-worker-free assets...).
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) return asset;

  // Client-side routing: bots get Markdown, browsers get the SPA shell.
  try {
    if (prefersMachineReadable(request.headers, query)) {
      const machine = await serveRoot(request.headers, query);
      if (machine) return machine;
    }
  } catch {
    /* fall through */
  }
  return spaShell(env, request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = (request.headers.get("x-request-id") ?? "").slice(0, 80) || crypto.randomUUID();
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await route(request, env);
    } catch (error) {
      console.error(JSON.stringify({ requestId, error: error instanceof Error ? error.message : String(error) }));
      response = text("Internal error", 500);
    }
    const out = new Response(response.body, response);
    out.headers.set("x-request-id", requestId);
    out.headers.set("x-content-type-options", "nosniff");
    out.headers.set("referrer-policy", "strict-origin-when-cross-origin");
    out.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
    out.headers.set("cross-origin-resource-policy", "cross-origin");
    const p = new URL(request.url).pathname;
    if (!p.endsWith("health") && p !== "/livez" && p !== "/readyz") {
      console.log(JSON.stringify({ requestId, method: request.method, path: p, status: out.status, durationMs: Date.now() - startedAt }));
    }
    return out;
  },
};
