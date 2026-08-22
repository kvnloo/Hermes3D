import { describe, expect, it } from "vitest";
import { parseMuseumSearchRecordV1, searchMuseum } from "@/features/living-museum/core/MuseumSearchV1";
import { exhibitRuntimeState, museumOfficeHref, museumRendererProfile, nextMuseumActivation, resolveMuseumRoute } from "@/features/living-museum/core/MuseumRuntimeV1";
import type { MuseumExhibitV1 } from "@/features/living-museum/core/MuseumExhibitV1";
import { MUSEUM_EXHIBIT_SLUGS } from "@/features/living-museum/core/MuseumExhibitV1";
import {
  MUSEUM_ANNEX_BLUEPRINT,
  MUSEUM_CAMERA_TRAVEL,
  MUSEUM_EXHIBIT_LIGHTING,
} from "@/features/living-museum/shell/OfficeMuseumRoom";
import { museumSearchCorpus, validatedMuseumExhibits } from "@/features/living-museum/registry";
import { MuseumSearch } from "@/features/living-museum/shell/MuseumSearch";
import { createElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

const records = [
  parseMuseumSearchRecordV1({ id: "command:arrival", type: "command", title: "Museum arrival", summary: "Return to the opening view.", keywords: ["home"], filters: ["command"], href: "/museum" }),
  parseMuseumSearchRecordV1({ id: "museum:halo", type: "exhibit", title: "Halo studies", summary: "An original abstract fan study.", keywords: ["ring", "game"], filters: ["exhibit", "game"], href: "/office?room=museum&exhibit=halo", exhibitSlug: "halo", destinationAnchor: "approach" }),
];

describe("museum public search", () => {
  it("ranks deterministically and handles bounded fuzzy queries", () => {
    expect(searchMuseum(records, "halo").map(({ id }) => id)).toEqual(["museum:halo"]);
    expect(searchMuseum(records, "halp")[0].id).toBe("museum:halo");
    expect(searchMuseum([...records].reverse(), "").map(({ id }) => id)).toEqual(["museum:halo", "command:arrival"]);
  });

  it("rejects unknown, unsafe and private-shaped data", () => {
    expect(() => parseMuseumSearchRecordV1({ ...records[0], html: "<script>x</script>" })).toThrow(/unknown fields/);
    expect(() => parseMuseumSearchRecordV1({ ...records[0], href: "javascript:alert(1)" })).toThrow(/href/);
    expect(() => parseMuseumSearchRecordV1({ ...records[0], sessionToken: "redacted" })).toThrow();
    expect(() => searchMuseum(records, "x".repeat(121))).toThrow(/query/);
  });

  it("keeps search destinations inside the office museum room", () => {
    expect(() => parseMuseumSearchRecordV1({ ...records[1], destinationAnchor: "detail" })).toThrow(/destinationAnchor/);
    expect(museumOfficeHref("halo")).toBe("/office?room=museum&exhibit=halo");
    expect(museumOfficeHref(null)).toBe("/office?room=museum");
  });

  it("uses one canonical search destination for every exhibit", () => {
    const exhibits = museumSearchCorpus.filter((record) => record.type === "exhibit");
    expect(exhibits.map((record) => record.exhibitSlug).sort()).toEqual([...MUSEUM_EXHIBIT_SLUGS].sort());
    for (const record of exhibits) expect(record.href).toBe(museumOfficeHref(record.exhibitSlug ?? null));
  });

  it("reports the exact selected search record to the office navigator", () => {
    const selected: string[] = [];
    render(createElement(MuseumSearch, { records: museumSearchCorpus, onNavigate: (record) => selected.push(record.exhibitSlug ?? "arrival") }));
    fireEvent.click(screen.getByRole("button", { name: /find an exhibit/i }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "star wars" } });
    fireEvent.click(screen.getByRole("option", { name: /star wars/i }));
    expect(selected).toEqual(["star-wars-game"]);
  });
});

describe("museum runtime ownership", () => {
  it("redirects the museum route into the office and has no museum-owned Canvas", () => {
    const pageSource = readFileSync("src/app/museum/page.tsx", "utf8");
    expect(pageSource).toContain("redirect(museumOfficeHref(slug))");
    const museumSources = sourceFiles("src/features/living-museum").map((path) => readFileSync(path, "utf8")).join("\n");
    expect(museumSources).not.toMatch(/<Canvas\b|createRoot\s*\(/);
    const officeSource = readFileSync("src/features/retro-office/RetroOffice3D.tsx", "utf8");
    expect(officeSource.match(/<Canvas\b/g)).toHaveLength(1);
  });

  it("derives fresh museum navigation before the first client render and resyncs on history", () => {
    const source = readFileSync("src/features/retro-office/RetroOffice3D.tsx", "utf8");
    expect(source).toContain("const museumSearch = useSyncExternalStore(");
    expect(source).toContain("const museumRoute = useMemo(");
    expect(source).toContain("const museumActive = museumRoute.active || museumActiveState");
    expect(source).toContain('window.addEventListener("popstate", syncFromUrl)');
  });

  it("uses a readable museum exposure and suspends office post-processing", () => {
    expect(museumRendererProfile(false)).toEqual({ exposure: 1, renderOfficePostFx: true });
    expect(museumRendererProfile(true)).toEqual({ exposure: 1.35, renderOfficePostFx: false });
  });

  it("keeps disconnected gateway prompts from occluding the public museum route", () => {
    const css = readFileSync("src/features/living-museum/shell/museum.css", "utf8");
    expect(css).toContain('body:has([data-museum-active="true"]) main > .z-50');
    expect(css).toContain('[aria-label="Connecting to runtime"]');
    expect(css).toContain('aside:has([aria-label="Synthetic demo agent states"])');
  });

  it("bounds a dedicated light rig to every active exhibit and removes arrival occlusion", () => {
    expect(Object.keys(MUSEUM_EXHIBIT_LIGHTING).sort()).toEqual([...MUSEUM_EXHIBIT_SLUGS].sort());
    const source = readFileSync("src/features/living-museum/shell/OfficeMuseumRoom.tsx", "utf8");
    expect(source).toContain("active && !activeSlug");
    expect(source).toContain("active && activeExhibit");
    expect(source).toContain("distance={15}");
    expect(source).toContain("distance={13}");
    expect(source).toContain("distance={12}");
    expect(source).not.toContain("<ambientLight");
    expect(source).not.toContain("<hemisphereLight");
    expect(source).not.toContain("<directionalLight");
    const officeSource = readFileSync("src/features/retro-office/RetroOffice3D.tsx", "utf8");
    expect(officeSource).toContain("!museumActive ? <StreamCameraController");
  });

  it("keeps a lit physical threshold and office sightline in the annex scene", () => {
    const source = readFileSync("src/features/living-museum/shell/OfficeMuseumRoom.tsx", "utf8");
    expect(source).toContain('name="MuseumAnnexFloor"');
    expect(source).toContain('name="MuseumAnnexThreshold"');
    expect(source).toContain('name="OfficeLandmarkSightline"');
    expect(source).toContain("meshStandardMaterial");
    expect(source).toMatch(/color="#[3-9a-f][0-9a-f]{5}"/i);
  });

  it("defines a bounded office doorway, corridor, annex, and multi-stage camera journey", () => {
    const { doorway, corridor, gallery } = MUSEUM_ANNEX_BLUEPRINT;
    expect(doorway.center[0]).toBeLessThan(corridor.center[0]);
    expect(corridor.depth).toBeGreaterThan(6);
    expect(corridor.width).toBeLessThan(doorway.width);
    expect(gallery.entryWidth).toBeGreaterThanOrEqual(corridor.width);
    expect(gallery.width).toBeGreaterThan(corridor.width * 2);
    expect(gallery.depth).toBeGreaterThan(corridor.depth);

    expect(MUSEUM_CAMERA_TRAVEL.map(({ stage }) => stage)).toEqual([
      "office-sightline",
      "threshold",
      "corridor",
      "annex-arrival",
    ]);
    for (let index = 1; index < MUSEUM_CAMERA_TRAVEL.length; index += 1) {
      const previous = MUSEUM_CAMERA_TRAVEL[index - 1];
      const current = MUSEUM_CAMERA_TRAVEL[index];
      expect(current.position[0]).toBeGreaterThan(previous.position[0]);
      expect(current.durationMs).toBeGreaterThanOrEqual(700);
    }
  });


  it("keeps exactly one active exhibit and sleeps offscreen work", () => {
    const first = nextMuseumActivation({ activeSlug: null, suppressedSpectacle: true }, "halo");
    const second = nextMuseumActivation(first, "pokemon-game");
    expect(second).toEqual({ activeSlug: "pokemon-game", suppressedSpectacle: true });
    expect(exhibitRuntimeState("halo", second, false)).toBe("sleep");
    expect(exhibitRuntimeState("pokemon-game", second, true)).toBe("active");
  });

  it("resolves every canonical exhibit URL without an anchor parameter", () => {
    const exhibits = validatedMuseumExhibits.map(({ manifest }) => manifest);
    for (const slug of MUSEUM_EXHIBIT_SLUGS) {
      expect(resolveMuseumRoute(new URLSearchParams(`room=museum&exhibit=${slug}`), exhibits)).toMatchObject({ active: true, exhibitSlug: slug, anchor: "approach" });
    }
  });

  it("falls invalid slugs back to arrival and leaves the museum on browser back", () => {
    const exhibits = [{ slug: "halo" }] as MuseumExhibitV1[];
    expect(resolveMuseumRoute(new URLSearchParams("room=museum&exhibit=%3Cscript%3E"), exhibits)).toEqual({ active: true, exhibitSlug: null, anchor: "establishing", requestId: 0 });
    expect(resolveMuseumRoute(new URLSearchParams(""), exhibits)).toEqual({ active: false, exhibitSlug: null, anchor: "establishing", requestId: 0 });
  });
});
