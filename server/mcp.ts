/**
 * Read-only remote MCP adapter over the existing Bloody Fishin briefing authority.
 * Transport: Streamable HTTP at POST/GET /mcp (stateless, Railway-friendly).
 */
import type { Request } from "express";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod";
import { briefMarkdown, buildBrief, resolveLocation } from "./briefing.js";
import { clientKey, consumeRateLimit, getCached, setCached } from "./ops.js";

export const MCP_SERVER_NAME = "bloody-fishin";
export const MCP_SERVER_VERSION = "1.0.0";

const BRIEF_TTL_MS = Number(process.env.BRIEF_CACHE_TTL_MS ?? 5 * 60_000);
const MCP_RATE_LIMIT = Number(process.env.MCP_RATE_LIMIT ?? process.env.BRIEF_RATE_LIMIT ?? 30);

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

const placeInput = {
  place: z
    .string()
    .optional()
    .describe("Named place, e.g. 'Bali', 'Denham', 'Vancouver', 'Rottnest', 'Broome'."),
  latitude: z.number().min(-90).max(90).optional().describe("Latitude when using coordinates."),
  longitude: z.number().min(-180).max(180).optional().describe("Longitude when using coordinates."),
  name: z.string().optional().describe("Optional label when latitude/longitude are provided."),
};

function assertRateLimit(clientId: string): void {
  const result = consumeRateLimit(`mcp:${clientId}`, MCP_RATE_LIMIT);
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Retry after ${result.retryAfterSec}s.`);
  }
}

/** Express middleware: rate-limit MCP before the Streamable HTTP handler. */
export function mcpRateLimitMiddleware(
  req: { ip?: string; headers: Record<string, unknown>; socket?: { remoteAddress?: string } },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
  next: () => void,
): void {
  const id = clientKey(req as Request);
  const result = consumeRateLimit(`mcp:${id}`, MCP_RATE_LIMIT);
  res.setHeader("X-RateLimit-Limit", String(MCP_RATE_LIMIT));
  res.setHeader("X-RateLimit-Remaining", String(result.remaining));
  if (!result.allowed) {
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ error: "Rate limit exceeded. Try again shortly." });
    return;
  }
  next();
}

function toBriefQuery(args: {
  place?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  days?: number;
  mode?: "vessel" | "wind";
  vessel?: string;
  maxWind?: number;
  minHours?: number;
  daylight?: boolean;
}): Record<string, string> {
  const q: Record<string, string> = {};
  if (args.latitude !== undefined && args.longitude !== undefined) {
    q.lat = String(args.latitude);
    q.lon = String(args.longitude);
    if (args.name) q.name = args.name;
  } else if (args.place?.trim()) {
    q.place = args.place.trim();
  } else {
    throw new Error("Provide either place, or both latitude and longitude.");
  }
  if (args.days !== undefined) q.days = String(args.days);
  if (args.mode) q.mode = args.mode;
  if (args.vessel) q.vessel = args.vessel;
  if (args.maxWind !== undefined) q.maxWind = String(args.maxWind);
  if (args.minHours !== undefined) q.minHours = String(args.minHours);
  if (args.daylight !== undefined) q.daylight = args.daylight ? "true" : "false";
  return q;
}

function fakeReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

function cacheKey(prefix: string, query: Record<string, string>): string {
  return `${prefix}:${Object.keys(query)
    .sort()
    .map((k) => `${k}=${query[k]}`)
    .join("&")}`;
}

async function loadBrief(query: Record<string, string>) {
  const key = cacheKey("mcp-json", query);
  const cached = getCached<Awaited<ReturnType<typeof buildBrief>>>(key);
  if (cached) return { brief: cached, cache: "HIT" as const };
  const brief = await buildBrief(fakeReq(query));
  setCached(key, brief, BRIEF_TTL_MS);
  return { brief, cache: "MISS" as const };
}

function toolResult(data: unknown, summary?: string) {
  const text = summary ?? JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: data as Record<string, unknown>,
  };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : "Tool failed.";
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

/** Build a fresh MCP server instance (stateless per-request factory). */
export function createBloodyFishinMcpServer(): McpServer {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
    title: "Bloody Dave's Fishing Planner",
  });

  server.registerTool(
    "resolve_place",
    {
      title: "Resolve place",
      description:
        "Resolve a named fishing/boating place or coordinates to a canonical location (name, latitude, longitude). Read-only.",
      inputSchema: z.object({
        ...placeInput,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const query = toBriefQuery(args);
        const location = await resolveLocation(fakeReq(query).query);
        return toolResult({ location }, `${location.name} (${location.lat}, ${location.lon})`);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "get_forecast",
    {
      title: "Get forecast",
      description:
        "Return structured weather, marine and fishing forecast for a place or coordinates. Includes temperature, wind, swell, rain, sunrise/sunset, tide rate, fishing score/stars, SL20 status, nextUsable and bestUpcoming windows. Read-only. Uses the same deterministic scoring as weather.bloodydaves.com.",
      inputSchema: z.object({
        ...placeInput,
        days: z.number().int().min(1).max(14).optional().describe("Forecast days (1–14). Default 5."),
        vessel: z
          .enum(["sl20", "tinnie", "offshore", "kayak"])
          .optional()
          .describe("Vessel profile for SL20/window criteria. Default sl20."),
        mode: z
          .enum(["vessel", "wind"])
          .optional()
          .describe("vessel = SL20+fishing criteria; wind = wind-only windows."),
        maxWind: z.number().min(0).max(80).optional().describe("Override max wind in knots for window filtering."),
        minHours: z.number().int().min(1).max(24).optional().describe("Minimum continuous window hours."),
        daylightOnly: z.boolean().optional().describe("Restrict windows to daylight hours."),
        format: z
          .enum(["json", "markdown"])
          .optional()
          .describe("Prefer structured JSON (default) or Markdown summary text."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const query = toBriefQuery({
          place: args.place,
          latitude: args.latitude,
          longitude: args.longitude,
          name: args.name,
          days: args.days ?? 5,
          vessel: args.vessel,
          mode: args.mode ?? "vessel",
          maxWind: args.maxWind,
          minHours: args.minHours,
          daylight: args.daylightOnly,
        });
        const { brief, cache } = await loadBrief(query);
        const payload = { ...brief, cache, source: "bloody-fishin", endpoint: "/mcp" };
        if (args.format === "markdown") {
          return {
            content: [{ type: "text" as const, text: briefMarkdown(brief) }],
            structuredContent: payload,
          };
        }
        return toolResult(
          payload,
          `${brief.location.name} · ${brief.timezone} · ${brief.days}d · nextUsable=${brief.nextUsable?.start ?? "none"}`,
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    "find_windows",
    {
      title: "Find windows",
      description:
        "Find the next continuous forecast windows matching criteria (e.g. wind under 10 kt for 3 hours at Denham). Defaults to wind-mode filtering. Read-only.",
      inputSchema: z.object({
        ...placeInput,
        days: z.number().int().min(1).max(14).optional().describe("Search horizon in days. Default 7."),
        maxWind: z.number().min(0).max(80).optional().describe("Maximum wind in knots. Default 10."),
        minHours: z.number().int().min(1).max(24).optional().describe("Minimum continuous hours. Default 3."),
        daylightOnly: z.boolean().optional().describe("Daylight-only windows. Default false for wind mode."),
        vessel: z.enum(["sl20", "tinnie", "offshore", "kayak"]).optional(),
        mode: z.enum(["vessel", "wind"]).optional().describe("Default wind for this tool."),
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const query = toBriefQuery({
          place: args.place,
          latitude: args.latitude,
          longitude: args.longitude,
          name: args.name,
          days: args.days ?? 7,
          vessel: args.vessel ?? "sl20",
          mode: args.mode ?? "wind",
          maxWind: args.maxWind ?? 10,
          minHours: args.minHours ?? 3,
          daylight: args.daylightOnly ?? false,
        });
        const { brief, cache } = await loadBrief(query);
        const payload = {
          generatedAt: brief.generatedAt,
          location: brief.location,
          timezone: brief.timezone,
          query: brief.query,
          nextUsable: brief.nextUsable,
          bestUpcoming: brief.bestUpcoming,
          nextWindows: brief.nextWindows,
          marineDataAvailableThrough: brief.marineDataAvailableThrough,
          marineDataWarning: brief.marineDataWarning,
          cache,
          source: "bloody-fishin",
        };
        return toolResult(
          payload,
          brief.nextUsable
            ? `Next window ${brief.nextUsable.start} → ${brief.nextUsable.end} (${brief.nextUsable.durationHours}h, max ${brief.nextUsable.maxWindKt} kt)`
            : `No qualifying window in ${brief.days} days for ${brief.location.name}.`,
        );
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

const mcpHttpHandler = createMcpHandler(() => createBloodyFishinMcpServer());
export const mcpNodeHandler = toNodeHandler(mcpHttpHandler);

export function mcpClientKey(req: { ip?: string; headers: Record<string, unknown> }): string {
  return clientKey(req as Request);
}
