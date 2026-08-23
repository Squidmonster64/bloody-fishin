import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resetOpsState } from "./ops.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("renderIndexHtml", () => {
  beforeEach(() => {
    resetOpsState();
    vi.resetModules();
  });

  it("injects forecast snapshot into the HTML shell", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("marine-api")) {
          return new Response(
            JSON.stringify({
              hourly: {
                time: ["2026-08-23T06:00"],
                wave_height: [0.8],
                swell_wave_height: [0.6],
                swell_wave_period: [10],
                wind_wave_height: [0.2],
                sea_level_height_msl: [0.5],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            timezone: "Australia/Perth",
            hourly: {
              time: ["2026-08-23T06:00", "2026-08-23T07:00", "2026-08-23T08:00"],
              temperature_2m: [18, 19, 20],
              wind_speed_10m: [8, 9, 10],
              wind_gusts_10m: [12, 13, 14],
              precipitation_probability: [0, 0, 10],
            },
            daily: {
              time: ["2026-08-23"],
              sunrise: ["2026-08-23T06:30"],
              sunset: ["2026-08-23T18:00"],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const { renderIndexHtml, loadIndexTemplate } = await import("./spaShell.js");
    const staticPath = path.resolve(__dirname, "..", "client");
    await loadIndexTemplate(staticPath);
    const html = await renderIndexHtml(staticPath, true);
    expect(html).toContain('id="reader-brief"');
    expect(html).toContain("Fremantle Offshore");
    expect(html).not.toContain("<!--READER_BRIEF-->");
    vi.unstubAllGlobals();
  });

  it("injects into legacy shells without READER_BRIEF placeholder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("marine-api")) {
          return new Response(JSON.stringify({ hourly: { time: [] } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            timezone: "Australia/Perth",
            hourly: {
              time: ["2026-08-23T06:00"],
              temperature_2m: [18],
              wind_speed_10m: [8],
              wind_gusts_10m: [12],
              precipitation_probability: [0],
            },
            daily: { time: ["2026-08-23"], sunrise: ["2026-08-23T06:30"], sunset: ["2026-08-23T18:00"] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const legacyPath = path.resolve(__dirname, "..", "tmp-legacy-shell");
    await fs.mkdir(legacyPath, { recursive: true });
    await fs.writeFile(
      path.join(legacyPath, "index.html"),
      '<!doctype html><html><head><title>legacy</title></head><body><div id="root"></div></body></html>',
      "utf8",
    );

    const { renderIndexHtml } = await import("./spaShell.js");
    const html = await renderIndexHtml(legacyPath, true);
    expect(html).toContain('id="reader-shell"');
    expect(html).toContain('id="reader-brief"');
    expect(html).toContain("Fremantle Offshore");
    vi.unstubAllGlobals();
  });
});

describe("serveRoot format=markdown", () => {
  beforeEach(() => {
    resetOpsState();
    vi.resetModules();
  });

  it("returns markdown when format=markdown", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("marine-api")) {
          return new Response(JSON.stringify({ hourly: { time: [] } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            timezone: "Australia/Perth",
            hourly: {
              time: ["2026-08-23T06:00"],
              temperature_2m: [18],
              wind_speed_10m: [8],
              wind_gusts_10m: [12],
              precipitation_probability: [0],
            },
            daily: { time: ["2026-08-23"], sunrise: ["2026-08-23T06:30"], sunset: ["2026-08-23T18:00"] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const { serveRoot } = await import("./spaShell.js");
    let body = "";
    let contentType = "";
    const req = {
      query: { format: "markdown" },
      headers: { accept: "text/html" },
    } as any;
    const res = {
      type(t: string) {
        contentType = t;
        return this;
      },
      send(payload: string) {
        body = payload;
      },
      json() {},
      setHeader() {},
    } as any;
    const handled = await serveRoot(req, res, path.resolve(__dirname, "..", "client"));
    expect(handled).toBe(true);
    expect(contentType).toContain("markdown");
    expect(body).toContain("Fremantle Offshore");
    vi.unstubAllGlobals();
  });

  it("returns markdown for bot user agents even with text/html accept", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("marine-api")) {
          return new Response(JSON.stringify({ hourly: { time: [] } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response(
          JSON.stringify({
            timezone: "Australia/Perth",
            hourly: {
              time: ["2026-08-23T06:00"],
              temperature_2m: [18],
              wind_speed_10m: [8],
              wind_gusts_10m: [12],
              precipitation_probability: [0],
            },
            daily: { time: ["2026-08-23"], sunrise: ["2026-08-23T06:30"], sunset: ["2026-08-23T18:00"] },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const { serveRoot } = await import("./spaShell.js");
    let body = "";
    let contentType = "";
    let readerFormat = "";
    const req = {
      query: {},
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "GPTBot/1.0",
      },
    } as any;
    const res = {
      type(t: string) {
        contentType = t;
        return this;
      },
      send(payload: string) {
        body = payload;
      },
      json() {},
      setHeader(name: string, value: string) {
        if (name === "X-Reader-Format") readerFormat = value;
      },
    } as any;
    const handled = await serveRoot(req, res, path.resolve(__dirname, "..", "client"));
    expect(handled).toBe(true);
    expect(contentType).toContain("markdown");
    expect(readerFormat).toBe("markdown");
    expect(body).toContain("Fremantle Offshore");
    vi.unstubAllGlobals();
  });
});
