import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { briefMarkdown, buildBrief } from "./briefing.js";
import { getCached, setCached } from "./ops.js";

export const READER_VERSION = "2";

const PLACEHOLDER = "<!--READER_BRIEF-->";

const READER_STYLES = `<style id="reader-shell-styles">
#reader-shell{font-family:Inter,system-ui,sans-serif;background:#0a1628;color:#c5d6e8;padding:1rem 1.25rem 2rem;line-height:1.5}
#reader-shell h1{color:#ff6b35;font-size:1.25rem;margin:0 0 .5rem}
#reader-shell a{color:#7eb8f7}
#reader-shell pre{white-space:pre-wrap;word-break:break-word;background:#0d1f3c;border:1px solid #1e3a5f;border-radius:.5rem;padding:.75rem;font-size:.75rem;max-height:70vh;overflow:auto}
.js #reader-shell{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>`;

const READER_LINKS = `<link rel="alternate" type="application/json" href="/brief.json?spot=freo&amp;days=7" title="Forecast JSON" />
<link rel="alternate" type="text/markdown" href="/brief?spot=freo&amp;days=7" title="Forecast Markdown" />`;

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
  try {
    const req = { query: { spot: "freo", days: "7", mode: "wind" } } as unknown as Request;
    const brief = await buildBrief(req);
    const md = briefMarkdown(brief);
    setCached(key, md, 5 * 60_000);
    return md;
  } catch {
    return [
      "# Bloody Dave's Fishing Planner — Public Forecast Brief",
      "",
      "Live forecast snapshot is temporarily unavailable.",
      "",
      "Use these machine-readable endpoints:",
      "- /brief?spot=freo&days=7",
      "- /brief.json?spot=freo&days=7",
      "- /health",
    ].join("\n");
  }
}

function readerBriefBlock(markdown: string): string {
  return `<section id="reader-brief" aria-label="Forecast text snapshot">
<h2>Current forecast (Fremantle Offshore, 7 days)</h2>
<p>Machine-readable endpoints: <a href="/brief?spot=freo&amp;days=7">/brief</a> · <a href="/brief.json?spot=freo&amp;days=7">/brief.json</a> · <a href="/health">/health</a> · <a href="/locations?spot=freo">/locations</a></p>
<pre>${escapeHtml(markdown)}</pre>
</section>`;
}

function readerShellHeader(): string {
  return `<div id="reader-shell">
<header>
<h1>Bloody Dave's Fishing Planner</h1>
<p>Interactive planner for SL20 boating and fishing conditions. The full app needs JavaScript. Automated readers should use the server endpoints below.</p>
<ul>
<li><a href="/brief?spot=freo&amp;days=7">Markdown forecast — /brief</a></li>
<li><a href="/brief.json?spot=freo&amp;days=7">JSON forecast — /brief.json</a></li>
<li><a href="/?format=markdown">This page as markdown — ?format=markdown</a></li>
<li><a href="/health">Health — /health</a></li>
</ul>
</header>`;
}

function readerShellFooter(): string {
  return `<noscript><p><strong>JavaScript is disabled.</strong> Use the links above or the forecast snapshot below.</p></noscript>
</div>`;
}

export async function loadIndexTemplate(staticPath: string): Promise<string> {
  if (!indexTemplate) {
    indexTemplate = await fs.readFile(path.join(staticPath, "index.html"), "utf8");
  }
  return indexTemplate;
}

/** Inject reader content into legacy or current index.html shells. */
export async function renderIndexHtml(staticPath: string, injectBrief = true): Promise<string> {
  let html: string;
  try {
    html = await loadIndexTemplate(staticPath);
  } catch {
    return `<!doctype html><html><body><h1>Bloody Dave's Fishing Planner</h1><p><a href="/brief.json?spot=freo&amp;days=7">JSON forecast</a> · <a href="/brief?spot=freo&amp;days=7">Markdown forecast</a></p></body></html>`;
  }
  if (!injectBrief) return html;

  const md = await defaultBriefMarkdown();
  const brief = readerBriefBlock(md);

  if (html.includes(PLACEHOLDER)) {
    return html.replace(PLACEHOLDER, brief);
  }

  if (!html.includes('id="reader-shell"')) {
    if (!html.includes("reader-shell-styles")) {
      html = html.includes("</head>")
        ? html.replace("</head>", `${READER_LINKS}\n${READER_STYLES}\n<script>document.documentElement.classList.add("js");</script>\n</head>`)
        : html;
    }
    const shell = `${readerShellHeader()}${brief}${readerShellFooter()}`;
    html = html.includes('<div id="root"></div>')
      ? html.replace('<div id="root"></div>', `${shell}\n<div id="root"></div>`)
      : html.replace("</body>", `${shell}\n</body>`);
  } else if (!html.includes('id="reader-brief"')) {
    html = html.replace(
      "<!--READER_BRIEF-->",
      brief,
    ).replace(
      "</header>",
      `</header>${brief}`,
    );
  }

  return html;
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

  // Automated readers and bots always get markdown on / — not an empty SPA shell.
  if (prefersMachineReadable(req)) {
    const md = await defaultBriefMarkdown();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Reader-Format", "markdown");
    res.setHeader("X-Reader-Version", READER_VERSION);
    res.type("text/markdown; charset=utf-8").send(md);
    return true;
  }

  // Fast path for browsers and health checks — static shell includes reader links.
  res.setHeader("X-Reader-Version", READER_VERSION);
  res.sendFile(path.join(staticPath, "index.html"));
  return true;
}
