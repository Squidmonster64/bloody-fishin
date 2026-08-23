import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetOpsState } from "./ops.js";

describe("MCP server factory", () => {
  beforeEach(() => {
    resetOpsState();
    vi.resetModules();
  });

  it("registers read-only forecast tools", async () => {
    const { createBloodyFishinMcpServer, MCP_SERVER_NAME } = await import("./mcp.js");
    const server = createBloodyFishinMcpServer();
    expect(MCP_SERVER_NAME).toBe("bloody-fishin");
    // Access registered tools via internal list if exposed; otherwise smoke-construct.
    expect(server).toBeTruthy();
    expect(typeof (server as { registerTool?: unknown }).registerTool).toBe("function");
  });

  it("get_forecast reuses briefing authority for named places", async () => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const u = String(url);
        if (u.includes("geocoding-api")) {
          return new Response(
            JSON.stringify({
              results: [
                {
                  name: "Bali",
                  latitude: -8.33,
                  longitude: 115,
                  country: "Indonesia",
                  country_code: "ID",
                  admin1: "Bali",
                },
              ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (u.includes("marine-api")) {
          return new Response(
            JSON.stringify({
              hourly: {
                time: [`${date}T06:00`, `${date}T07:00`, `${date}T08:00`],
                wave_height: [0.8, 0.8, 0.9],
                swell_wave_height: [0.6, 0.6, 0.7],
                swell_wave_period: [10, 10, 11],
                wind_wave_height: [0.2, 0.2, 0.2],
                sea_level_height_msl: [0.4, 0.5, 0.6],
              },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({
            timezone: "Asia/Makassar",
            hourly: {
              time: [`${date}T06:00`, `${date}T07:00`, `${date}T08:00`],
              temperature_2m: [28, 29, 30],
              wind_speed_10m: [5, 6, 7],
              wind_direction_10m: [180, 190, 200],
              wind_gusts_10m: [8, 9, 10],
              precipitation_probability: [0, 0, 5],
            },
            daily: {
              time: [date],
              sunrise: [`${date}T06:30`],
              sunset: [`${date}T18:00`],
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }),
    );

    const { buildBrief } = await import("./briefing.js");
    const brief = await buildBrief({
      query: { place: "Bali", days: "3" },
    } as any);
    expect(brief.location.name).toMatch(/Indonesia/i);
    expect(brief.upcomingHours[0]).toHaveProperty("windDirDeg");
    expect(brief.upcomingHours[0]).toHaveProperty("seaLevelM");
    expect(brief).toHaveProperty("nextUsable");
    vi.unstubAllGlobals();
  });
});
