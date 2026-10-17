/**
 * Read-only remote MCP adapter over the existing Bloody Fishin briefing authority.
 * Node/Express adapter (Railway). The tool definitions live in ./mcpServer.ts so the
 * Cloudflare Worker can share them without pulling in Node HTTP modules.
 * Transport: Streamable HTTP at POST/GET /mcp (stateless).
 */
import type { Request } from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { clientKey, consumeRateLimit } from "./ops.js";
import {
  MCP_RATE_LIMIT,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  createBloodyFishinMcpServer,
} from "./mcpServer.js";

export { MCP_SERVER_NAME, MCP_SERVER_VERSION, createBloodyFishinMcpServer };

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

const mcpHttpHandler = createMcpHandler(() => createBloodyFishinMcpServer());
export const mcpNodeHandler = toNodeHandler(mcpHttpHandler);

export function mcpClientKey(req: { ip?: string; headers: Record<string, unknown> }): string {
  return clientKey(req as Request);
}
