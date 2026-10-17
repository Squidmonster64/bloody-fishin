/** Worker adapter for the read-only MCP endpoint (stateless Streamable HTTP). */
import { createMcpHandler } from "@modelcontextprotocol/server";
import { createBloodyFishinMcpServer } from "../server/mcpServer.js";

const handler = createMcpHandler(() => createBloodyFishinMcpServer());

export function handleMcp(request: Request): Promise<Response> {
  return handler.fetch(request);
}
