import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { briefMarkdown, buildBrief } from "./briefing.js";
import { getCached, setCached } from "./ops.js";

const PLACEHOLDER = "<!--READER_BRIEF-->";

let indexTemplate: string | null = null;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** True when the client likely cannot use the React SPA. */
export function prefersMachineReadable(req: Request): boolean {
  const accept = (req.headers.accept || "").toLowerCase();
  const ua = (req.headers["user-agent"] || "").toLowerCase();
  const format = typeof req.query.format === "string" ? req.query.format.toLowerCase() : "";
  if (format === "text" || format === "markdown" || format === "md" || format === "json") return true;
  if (/text\/markdown/.test(accept) && !/text\/html/.test(accept)) return true;
  if (/application\/json/.test(accept) && !/text\/html/.test(accept)) return true;
  if (
    /bot|crawler|spider|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|quora link preview|showyoubot|outbrain|pinterest|slackbot|vkshare|w3c_validator|redditbot|applebot|whatsapp|telegrambot|googlebot|bingbot|duckduckbot|baiduspider|yandexbot|exabot|facebot|ia_archiver|gptbot|chatgpt|claude|anthropic|bytespider|cohere|perplexity|youbot/i.test(
      ua,
    )
  ) {
    return true;
  }
  return false;
}

async function defaultBriefMarkdown(): Promise<string> {
  const key = "reader:default-brief-md";
  const cached = getCached<string>(key);
  if (cached) return cached;
  const req = { query: { spot: "freo", days: "7", mode: "wind" } } as unknown as Request;
  const brief = await buildBrief(req);
  const md = briefMarkdown(brief);
  setCached(key, md, 5 * 60_000);
  return md;
}

function readerBriefBlock(markdown: string): string {
  return `<section id="reader-brief" aria-label="Forecast text snapshot">
<h2>Current forecast (Fremantle Offshore, 7 days)</h2>
<p>Machine-readable endpoints: <a href="/brief?spot=freo&amp;days=7">/brief</a> · <a href="/brief.json?spot=freo&amp;days=7">/brief.json</a> · <a href="/health">/health</a> · <a href="/locations?spot=freo">/locations</a></p>
<pre>${escapeHtml(markdown)}</pre>
</section>`;
}

export async function loadIndexTemplate(staticPath: string): Promise<string> {
  if (!indexTemplate) {
    indexTemplate = await fs.readFile(path.join(staticPath, "index.html"), "utf8");
  }
  return indexTemplate;
}

export async function renderIndexHtml(staticPath: string, injectBrief = true): Promise<string> {
  const template = await loadIndexTemplate(staticPath);
  if (!injectBrief || !template.includes(PLACEHOLDER)) return template;
  const md = await defaultBriefMarkdown();
  return template.replace(PLACEHOLDER, readerBriefBlock(md));
}

export async function serveRoot(req: Request, res: Response, staticPath: string): Promise<boolean> {
  const format = typeof req.query.format === "string" ? req.query.format.toLowerCase() : "";

  if (format === "json") {
    const briefReq = { query: { spot: "freo", days: "7", mode: "wind", ...req.query } } as unknown as Request;
    const brief = await buildBrief(briefReq);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.json(brief);
    return true;
  }

  if (format === "markdown" || format === "md" || format === "text") {
    const briefReq = { query: { spot: "freo", days: "7", mode: "wind", ...req.query } } as unknown as Request;
    const brief = await buildBrief(briefReq);
    res.type("text/markdown; charset=utf-8").send(briefMarkdown(brief));
    return true;
  }

  const accept = (req.headers.accept || "").toLowerCase();
  if (/text\/markdown/.test(accept) && !/text\/html/.test(accept)) {
    const md = await defaultBriefMarkdown();
    res.type("text/markdown; charset=utf-8").send(md);
    return true;
  }

  if (prefersMachineReadable(req) && !/text\/html/.test(accept)) {
    const md = await defaultBriefMarkdown();
    res.type("text/markdown; charset=utf-8").send(md);
    return true;
  }

  const html = await renderIndexHtml(staticPath, true);
  res.type("text/html; charset=utf-8").send(html);
  return true;
}
