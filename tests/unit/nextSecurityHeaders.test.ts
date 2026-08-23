import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

async function contentSecurityPolicy() {
  const { default: config } = await import("../../next.config");
  const routes = await config.headers?.();
  return routes?.[0]?.headers.find((header) => header.key === "Content-Security-Policy")?.value;
}

async function strictTransportSecurity() {
  const { default: config } = await import("../../next.config");
  const routes = await config.headers?.();
  return routes?.[0]?.headers.find((header) => header.key === "Strict-Transport-Security")?.value;
}

describe("production transport security headers", () => {
  it("does not upgrade same-origin assets when the production server uses HTTP", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTPS", "");
    vi.resetModules();

    expect(await contentSecurityPolicy()).not.toContain("upgrade-insecure-requests");
    expect(await strictTransportSecurity()).toBeUndefined();
  });

  it("upgrades insecure requests when the production server explicitly uses HTTPS", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("HTTPS", "true");
    vi.resetModules();

    expect(await contentSecurityPolicy()).toContain("upgrade-insecure-requests");
    expect(await strictTransportSecurity()).toBe("max-age=31536000; includeSubDomains");
  });
});
