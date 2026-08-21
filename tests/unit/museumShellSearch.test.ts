import { describe, expect, it } from "vitest";
import { parseMuseumSearchRecordV1, searchMuseum } from "@/features/living-museum/core/MuseumSearchV1";
import { exhibitRuntimeState, nextMuseumActivation, resolveMuseumDeepLink } from "@/features/living-museum/core/MuseumRuntimeV1";
import type { MuseumExhibitV1 } from "@/features/living-museum/core/MuseumExhibitV1";

const records = [
  parseMuseumSearchRecordV1({ id: "command:arrival", type: "command", title: "Museum arrival", summary: "Return to the opening view.", keywords: ["home"], filters: ["command"], href: "/museum" }),
  parseMuseumSearchRecordV1({ id: "museum:halo", type: "exhibit", title: "Halo studies", summary: "An original abstract fan study.", keywords: ["ring", "game"], filters: ["exhibit", "game"], href: "/museum?exhibit=halo&anchor=approach", exhibitSlug: "halo", destinationAnchor: "approach" }),
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

  it("requires authored approach deep-links", () => {
    expect(() => parseMuseumSearchRecordV1({ ...records[1], destinationAnchor: "detail" })).toThrow(/destinationAnchor/);
    expect(() => parseMuseumSearchRecordV1({ ...records[1], href: "/museum?exhibit=halo&anchor=detail" })).toThrow(/approach/);
  });
});

describe("museum runtime ownership", () => {
  it("keeps exactly one active exhibit and sleeps offscreen work", () => {
    const first = nextMuseumActivation({ activeSlug: null, suppressedSpectacle: true }, "halo");
    const second = nextMuseumActivation(first, "pokemon-game");
    expect(second).toEqual({ activeSlug: "pokemon-game", suppressedSpectacle: true });
    expect(exhibitRuntimeState("halo", second, false)).toBe("sleep");
    expect(exhibitRuntimeState("pokemon-game", second, true)).toBe("active");
  });

  it("fails invalid deep-links to arrival without reflecting input", () => {
    const exhibits = [{ slug: "halo" }] as MuseumExhibitV1[];
    expect(resolveMuseumDeepLink(new URLSearchParams("exhibit=halo&anchor=approach"), exhibits).exhibitSlug).toBe("halo");
    expect(resolveMuseumDeepLink(new URLSearchParams("exhibit=%3Cscript%3E&anchor=detail"), exhibits)).toEqual({ exhibitSlug: null, anchor: "establishing", requestId: 0 });
  });
});
