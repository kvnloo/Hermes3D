import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const output = join(root, "artifacts/hitl/cardtwin-semantic-layers/aggregate/test-verification-report.md");

describe("CardTwin deterministic semantic layer contract", () => {
  it("verifies all three ontology-v3 manifests and pixels with the pinned image environment", () => {
    const python = "/mnt/zer0models/project-envs/cardtwin-sam2/bin/python";
    const result = spawnSync(python, ["scripts/verify-cardtwin-cross-card.py", "--output", output], { cwd: root, encoding: "utf8" });
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(expect.objectContaining({ status: "PASS", cards: 3 }));
    expect(readFileSync(output, "utf8")).toContain("Verdict: GREEN — 3/3 cards pass");
  }, 30_000);
});
