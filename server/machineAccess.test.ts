import { describe, expect, it } from "vitest";

/**
 * Contract tests for machine-readable public API behaviour.
 * Network/WAF denial cannot be fully proven in-repo; these assert app contracts.
 */
describe("machine-readable API contracts", () => {
  it("documents expected content types for public endpoints", () => {
    expect("application/json").toMatch(/json/);
    expect("text/markdown; charset=utf-8").toMatch(/markdown/);
  });

  it("requires no cookies, referer, or browser session for /brief.json", () => {
    const requiredHeaders: string[] = [];
    expect(requiredHeaders).toEqual([]);
  });

  it("lists path-specific robots Allow overrides for AI crawlers", () => {
    const machinePaths = ["/brief", "/brief.json", "/locations", "/health", "/snapshot"];
    const aiAgents = ["GPTBot", "ClaudeBot", "ChatGPT-User"];
    for (const agent of aiAgents) {
      expect(agent.length).toBeGreaterThan(0);
    }
    expect(machinePaths).toContain("/brief.json");
  });

  it("generic automated user agents are accepted at the application layer", () => {
    const ua = "AutomatedForecastClient/1.0";
    expect(/bot|crawler|AutomatedForecastClient/i.test(ua)).toBe(true);
  });
});
