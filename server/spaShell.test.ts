import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { prefersMachineReadable } from "./spaShell";

function fakeReq(overrides: Partial<Request> & { query?: Record<string, string> } = {}): Request {
  return {
    headers: overrides.headers ?? {},
    query: overrides.query ?? {},
  } as Request;
}

describe("prefersMachineReadable", () => {
  it("detects explicit format query", () => {
    expect(prefersMachineReadable(fakeReq({ query: { format: "markdown" } }))).toBe(true);
    expect(prefersMachineReadable(fakeReq({ query: { format: "json" } }))).toBe(true);
  });

  it("detects markdown accept without html", () => {
    expect(
      prefersMachineReadable(
        fakeReq({ headers: { accept: "text/markdown" } }),
      ),
    ).toBe(true);
  });

  it("detects common bot user agents", () => {
    expect(
      prefersMachineReadable(
        fakeReq({ headers: { "user-agent": "GPTBot/1.0" } }),
      ),
    ).toBe(true);
    expect(
      prefersMachineReadable(
        fakeReq({ headers: { "user-agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } }),
      ),
    ).toBe(true);
  });

  it("does not treat normal browsers as machine-only", () => {
    expect(
      prefersMachineReadable(
        fakeReq({
          headers: {
            accept: "text/html,application/xhtml+xml",
            "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
          },
        }),
      ),
    ).toBe(false);
  });
});
