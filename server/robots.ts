/** Pure robots.txt body shared by the Express server and the Cloudflare Worker. */
export function robotsTxt(): string {
  // Cloudflare prepends managed Disallow for GPTBot/ClaudeBot/etc.
  // Explicit Allow rules for the same user-agents override path-level access
  // for clients that use longest-match robots semantics (machine API paths only).
  const machinePaths = ["/brief", "/brief.json", "/locations", "/health", "/snapshot", "/mcp"];
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
    "# https://weather.bloodydaves.com/mcp  (Model Context Protocol)",
    "# https://weather.bloodydaves.com/brief?spot=freo&days=7",
    "# Content-Signal: search=yes, ai-input=yes, ai-train=no, use=reference",
    "",
  ];
  for (const agent of aiAgents) {
    lines.push(`User-agent: ${agent}`);
    for (const p of machinePaths) lines.push(`Allow: ${p}`);
    lines.push("");
  }
  return lines.join("\n");
}
