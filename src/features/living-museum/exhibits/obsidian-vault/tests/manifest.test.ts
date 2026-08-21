import { describe, expect, it, vi } from "vitest";

import { parseMuseumExhibitV1 } from "../../../core/MuseumExhibitV1";
import { selectObsidianVaultLod } from "../ExhibitScene";
import { obsidianVaultManifest } from "../manifest";

const PRIVATE_METADATA =
  /(?:\/home\/|\/Users\/|\.obsidian|vaultPath|fileName|noteName|attachment|backlink|graphData|workspace|kanban|tailnet|gateway|token|secret)/i;

describe("obsidian-vault disabled placeholder", () => {
  it("parses the exact public contract and rejects private additions", () => {
    expect(parseMuseumExhibitV1(obsidianVaultManifest)).toBe(obsidianVaultManifest);
    expect(() =>
      parseMuseumExhibitV1({ ...obsidianVaultManifest, vaultPath: "/private/source" }),
    ).toThrow(/unknown fields: vaultPath/);
    expect(() =>
      parseMuseumExhibitV1({ ...obsidianVaultManifest, noteNames: ["private"] }),
    ).toThrow(/unknown fields: noteNames/);
  });

  it("contains only public placeholder metadata", () => {
    expect(obsidianVaultManifest.id).toBe("museum:obsidian-vault");
    expect(obsidianVaultManifest.category).toBe("private-placeholder");
    expect(obsidianVaultManifest.publicUrls).toEqual([]);
    expect(obsidianVaultManifest.assets).toEqual([]);
    expect(JSON.stringify(obsidianVaultManifest)).not.toMatch(PRIVATE_METADATA);
  });

  it("imports successfully while filesystem access is forbidden", async () => {
    vi.resetModules();
    vi.doMock("node:fs", () => {
      throw new Error("filesystem access forbidden");
    });
    vi.doMock("node:fs/promises", () => {
      throw new Error("filesystem access forbidden");
    });

    const imported = await import("../manifest");
    expect(imported.obsidianVaultManifest.id).toBe("museum:obsidian-vault");
    vi.doUnmock("node:fs");
    vi.doUnmock("node:fs/promises");
  });

  it("authors five distinct anchors and a static four-tier LOD", () => {
    const anchors = Object.values(obsidianVaultManifest.cameraAnchors);
    expect(anchors).toHaveLength(5);
    expect(new Set(anchors.map((anchor) => anchor.position.join(","))).size).toBe(5);
    expect(obsidianVaultManifest.lod.map(({ tier }) => tier)).toEqual([
      "hero",
      "near",
      "far",
      "sleep",
    ]);
    expect(obsidianVaultManifest.lod.every(({ animationHz }) => animationHz === 0)).toBe(true);
    expect(obsidianVaultManifest.states.sleep.animation).toBe("none");
    expect(obsidianVaultManifest.states.milestone.maxDurationMs).toBe(0);
  });

  it("handles arbitrary distance jumps and fail-closed suspension", () => {
    expect(selectObsidianVaultLod(8, "near")).toBe("hero");
    expect(selectObsidianVaultLod(24, "near")).toBe("far");
    expect(selectObsidianVaultLod(56, "near")).toBe("sleep");
    expect(selectObsidianVaultLod(44, "sleep")).toBe("far");
    expect(selectObsidianVaultLod(Number.NaN, "hero")).toBe("sleep");
  });

  it("declares a zero-byte, zero-texture original primitive scene", () => {
    expect(obsidianVaultManifest.budget.maxInitialBytes).toBe(0);
    expect(obsidianVaultManifest.budget.maxDeferredBytes).toBe(0);
    expect(obsidianVaultManifest.budget.maxTextures).toBe(0);
    expect(obsidianVaultManifest.trademarkNotice).toMatch(/Original project-authored placeholder/);
  });
});
