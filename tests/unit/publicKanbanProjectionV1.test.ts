import { describe, expect, it } from "vitest";
import source from "../../config/public-kanban-projection.v1.json";
import { parsePublicKanbanProjectionV1 } from "@/lib/public-boplog/publicKanbanProjectionV1";

const clone = (): Record<string, unknown> => structuredClone(source);

describe("PublicKanbanProjectionV1", () => {
  it("accepts only exact mapped public projects and reconciled aggregates", () => {
    const parsed = parsePublicKanbanProjectionV1(source);
    expect(parsed?.entries.map((entry) => entry.publicId)).toEqual(["hermes-keel", "boplog"]);
    expect(parsed?.entries[0].counts.total).toBe(20);
  });

  it.each(["tasks", "comments", "assignees", "paths", "models", "privateProject"])("rejects forbidden extra field %s", (field) => {
    const candidate = clone();
    candidate[field] = "private payload";
    expect(parsePublicKanbanProjectionV1(candidate)).toBeNull();
  });

  it("rejects private payload injection, cross-project IDs, duplicate IDs, and bad totals", () => {
    for (const mutate of [
      (entries: Array<Record<string, unknown>>) => { entries[0].provenance = "/home/secret"; },
      (entries: Array<Record<string, unknown>>) => { entries[0].publicId = "private-client"; },
      (entries: Array<Record<string, unknown>>) => { entries[1].publicId = entries[0].publicId; },
      (entries: Array<Record<string, unknown>>) => { (entries[0].counts as Record<string, unknown>).total = 21; },
    ]) {
      const candidate = clone();
      mutate(candidate.entries as Array<Record<string, unknown>>);
      expect(parsePublicKanbanProjectionV1(candidate)).toBeNull();
    }
  });

  it("fails closed on seal tampering", () => {
    const candidate = clone();
    candidate.projectionHash = `sha256:${"0".repeat(64)}`;
    expect(parsePublicKanbanProjectionV1(candidate)).toBeNull();
  });
});