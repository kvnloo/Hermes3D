import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivingEncounter } from "@/features/cardtwin/LivingEncounter";
import type { PokemonDetail } from "@/features/cardtwin/providers/contracts";

const pokemon: PokemonDetail = {
  id: 25, name: "Pikachu", artworkUrl: "https://images.test/25.png", animatedSpriteUrl: "https://images.test/25.gif", shinyArtworkUrl: "https://images.test/shiny/25.png", cryUrl: "https://audio.test/25.ogg", generation: 1, region: "Kanto", source: "PokeAPI", types: ["electric"], abilities: ["Static"], stats: [], evolution: [], habitat: "forest", color: "yellow", forms: [{ id: 25, name: "Pikachu", isDefault: true }],
};

describe("Living Encounter runtime", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 7));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("renders one dominant, truthfully labelled animated presentation", () => {
    render(<LivingEncounter pokemon={pokemon} model={null} />);
    expect(screen.getByRole("region", { name: "Living Encounter" })).toHaveAttribute("data-asset-kind", "animated");
    expect(screen.getByRole("img", { name: /animated sprite/i })).toBeVisible();
    expect(screen.getByText("Animated 2D sprite")).toBeVisible();
  });

  it("keeps audio off until the explicit speaker control is used", () => {
    render(<LivingEncounter pokemon={pokemon} model={null} />);
    const audio = document.querySelector("audio")!;
    const play = vi.spyOn(audio, "play").mockResolvedValue();
    expect(audio.autoplay).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /enable cry audio/i }));
    fireEvent.click(screen.getByRole("button", { name: /react/i }));
    expect(play).toHaveBeenCalledOnce();
  });

  it("releases its sole animation owner and pointer listener on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const view = render(<LivingEncounter pokemon={pokemon} model={null} />);
    view.unmount();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(7);
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
  });
});
