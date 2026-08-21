import { describe, expect, it } from "vitest";
import sourceProjection from "../../config/public-boplog-projection.v1.json";
import { parsePublicBoplogProjectionV1 } from "@/lib/public-boplog/publicBoplogProjectionV1";

const clone = (): Record<string, unknown> => structuredClone(sourceProjection);

describe("PublicBoplogProjectionV1", () => {
  it("accepts only the sealed public projection", () => {
    const parsed = parsePublicBoplogProjectionV1(sourceProjection);
    expect(parsed?.entries).toHaveLength(8);
    expect(parsed?.entries.map((entry) => entry.publicId)).toEqual(["hermes-keel", "baseline-tennis", "boplog", "aliens-made-this", "halo", "tmux-agent-fleet", "tesla", "kpu-sim"]);
  });

  it.each(["private", "published", "logs", "tasks", "prompts", "messages", "models", "providers", "path", "hostname", "ip", "branch", "sha", "revenue", "priority", "blockers"])("rejects unknown or prohibited root field %s", (field) => {
    const candidate = clone();
    candidate[field] = "must-not-ship";
    expect(parsePublicBoplogProjectionV1(candidate)).toBeNull();
  });

  it.each(["private", "published", "client", "roadmap", "metrics", "status", "localPath", "task"])("rejects unknown or prohibited entry field %s", (field) => {
    const candidate = clone();
    (candidate.entries as Array<Record<string, unknown>>)[0][field] = "must-not-ship";
    expect(parsePublicBoplogProjectionV1(candidate)).toBeNull();
  });

  it("rejects private, local, broken-ownership, and credentialed URLs", () => {
    for (const url of ["http://127.0.0.1/private", "https://private.example.test/x", "https://github.com/other/private", "https://user:pass@github.com/kvnloo/boplog", "https://kvnloo.github.io:8443/boplog/"]) {
      const candidate = clone();
      (candidate.entries as Array<Record<string, unknown>>)[0].urls = [url];
      expect(parsePublicBoplogProjectionV1(candidate)).toBeNull();
    }
  });

  it("rejects XSS, long text, duplicate IDs, and invalid order", () => {
    const xss = clone();
    (xss.entries as Array<Record<string, unknown>>)[0].summary = "<img src=x onerror=alert(1)>";
    expect(parsePublicBoplogProjectionV1(xss)).toBeNull();
    const longText = clone();
    (longText.entries as Array<Record<string, unknown>>)[0].summary = "x".repeat(181);
    expect(parsePublicBoplogProjectionV1(longText)).toBeNull();
    const duplicate = clone();
    const entries = duplicate.entries as Array<Record<string, unknown>>;
    entries[1].publicId = entries[0].publicId;
    expect(parsePublicBoplogProjectionV1(duplicate)).toBeNull();
    const outOfOrder = clone();
    (outOfOrder.entries as Array<Record<string, unknown>>)[1].order = 9;
    expect(parsePublicBoplogProjectionV1(outOfOrder)).toBeNull();
  });
});
