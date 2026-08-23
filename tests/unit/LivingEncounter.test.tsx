import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LivingEncounter } from "@/features/cardtwin/LivingEncounter";
import type { PokemonDetail } from "@/features/cardtwin/providers/contracts";

vi.mock("@react-three/fiber", () => ({ Canvas: () => <div data-testid="model-canvas"><span data-testid="orbit-controls" /></div>, useFrame: vi.fn() }));
vi.mock("@react-three/drei", () => ({ OrbitControls: () => <span data-testid="orbit-controls" />, useGLTF: () => ({ scene: {} }) }));

const pokemon: PokemonDetail = {
  id: 25, name: "Pikachu", artworkUrl: "https://images.test/25.png", animatedSpriteUrl: "https://images.test/25.gif", shinyArtworkUrl: "https://images.test/shiny/25.png", cryUrl: "https://audio.test/25.ogg", generation: 1, region: "Kanto", source: "PokeAPI", types: ["electric"], abilities: ["Static"], stats: [], evolution: [], habitat: "forest", color: "yellow", forms: [{ id: 25, name: "Pikachu", isDefault: true }],
};

describe("Living Encounter runtime", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 7));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: false } });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("can be server-rendered before browser preference APIs exist", () => {
    expect(() => renderToString(<LivingEncounter pokemon={pokemon} model={null} />)).not.toThrow();
  });

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
    expect((window as typeof window & { __livingEncounterRuntime?: { owners: number; listeners: number; reactions: number } }).__livingEncounterRuntime).toEqual({ owners: 0, listeners: 0, reactions: 0 });
  });

  it("renders an approved model in one lit canvas with bounded orbit", () => {
    render(<LivingEncounter pokemon={pokemon} model={{ pokemonId: 25, catalogVersion: "2", modelUrl: "/approved.glb", derivativeSha256: "a", promotionRecord: "review", license: "approved", attribution: "reviewed" }} />);
    expect(screen.getAllByTestId("model-canvas")).toHaveLength(1);
    expect(screen.getByTestId("orbit-controls")).toBeVisible();
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it("offers only evidenced shiny assets and changes the presentation", () => {
    render(<LivingEncounter pokemon={pokemon} model={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Shiny" }));
    expect(screen.getByRole("img")).toHaveAttribute("src", pokemon.shinyArtworkUrl);
  });

  it("exposes API-evidenced forms as deep links", () => {
    const withForm = { ...pokemon, forms: [...pokemon.forms, { id: 10080, name: "Pikachu Rock Star", isDefault: false }] };
    render(<LivingEncounter pokemon={withForm} model={null} />);
    expect(screen.getByRole("link", { name: "Pikachu Rock Star" })).toHaveAttribute("href", "/pokedex/10080");
  });

  it("disables particles, audio, and motion work in data saver mode", () => {
    Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } });
    render(<LivingEncounter pokemon={pokemon} model={null} />);
    expect(screen.getByRole("region")).toHaveAttribute("data-particles", "0");
    expect(screen.getByRole("button", { name: /audio unavailable in data saver/i })).toBeDisabled();
  });

  it("installs no pointer or animation work for reduced motion", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const add = vi.spyOn(window, "addEventListener");
    render(<LivingEncounter pokemon={pokemon} model={null} />);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    expect(add).not.toHaveBeenCalledWith("pointermove", expect.any(Function), expect.anything());
  });

  it("cancels reaction work across twenty route entries", () => {
    vi.useFakeTimers();
    for (let index = 0; index < 20; index += 1) {
      const view = render(<LivingEncounter pokemon={pokemon} model={null} />);
      fireEvent.click(screen.getByRole("button", { name: /react/i }));
      view.unmount();
    }
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
