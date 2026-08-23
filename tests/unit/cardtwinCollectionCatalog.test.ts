import { describe, expect, it, vi } from "vitest";
import {
  buildCatalogHref,
  generationForPokemon,
  parseCatalogQuery,
  paginate,
} from "@/features/cardtwin/catalogQuery";
import { createCachedFetcher } from "@/features/cardtwin/providers/cache";
import { findExactCardTwin } from "@/features/cardtwin/cardTwinIdentity";

describe("CardTwin collection catalog contracts", () => {
  it("round-trips URL-addressable search, filters, and page state", () => {
    const query = parseCatalogQuery({ q: "Pika chu", generation: "1", type: "electric", page: "2" });
    expect(query).toEqual({ q: "Pika chu", generation: 1, type: "electric", page: 2 });
    expect(buildCatalogHref("/pokedex", query)).toBe("/pokedex?q=Pika+chu&generation=1&type=electric&page=2");
  });

  it("maps National Dex boundaries to evidence-backed generations", () => {
    expect(generationForPokemon(1)).toEqual({ generation: 1, region: "Kanto" });
    expect(generationForPokemon(152)).toEqual({ generation: 2, region: "Johto" });
    expect(generationForPokemon(1025)).toEqual({ generation: 9, region: "Paldea" });
    expect(generationForPokemon(1026)).toBeNull();
  });

  it("paginates without exposing an eager full-image page", () => {
    const result = paginate(Array.from({ length: 1025 }, (_, index) => index + 1), 2, 24);
    expect(result.items).toHaveLength(24);
    expect(result.items[0]).toBe(25);
    expect(result.totalPages).toBe(43);
  });

  it("retries a transient response and deterministically reuses the cached value", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const cached = createCachedFetcher({ fetcher, retries: 1, timeoutMs: 100, ttlMs: 60_000 });
    await expect(cached.json("fixture-key", "https://example.test/data")).resolves.toEqual({ ok: true });
    await expect(cached.json("fixture-key", "https://example.test/data")).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("fails closed unless a card source identity exactly matches a processed printing", () => {
    expect(findExactCardTwin({ sourceId: "sm1-22", setName: "Sun & Moon", number: "22" })?.id).toBe("arcanine-sm1-22");
    expect(findExactCardTwin({ sourceId: "sm1-22", setName: "Sun & Moon", number: "23" })).toBeNull();
    expect(findExactCardTwin({ sourceId: "unknown", setName: "Sun & Moon", number: "22" })).toBeNull();
  });
});
