"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pokemon3DAssetCatalogEntry } from "./pokemon3dCatalog";
import type { PokemonDetail } from "./providers/contracts";
import { habitatForPokemon, selectEncounterAsset } from "./livingEncounter";

export function LivingEncounter({ pokemon, model }: { pokemon: PokemonDetail; model: Pokemon3DAssetCatalogEntry | null }) {
  const root = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [reacting, setReacting] = useState(false);
  const habitat = useMemo(() => habitatForPokemon(pokemon.habitat, pokemon.types), [pokemon.habitat, pokemon.types]);
  const asset = selectEncounterAsset({ modelUrl: model?.modelUrl ?? null, animatedUrl: pokemon.animatedSpriteUrl, artworkUrl: pokemon.artworkUrl });

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = (event: PointerEvent) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 12;
      targetY = (event.clientY / window.innerHeight - 0.5) * 8;
    };
    const frame = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      node.style.setProperty("--encounter-x", `${x.toFixed(2)}px`);
      node.style.setProperty("--encounter-y", `${y.toFixed(2)}px`);
      raf = requestAnimationFrame(frame);
    };
    window.addEventListener("pointermove", pointer, { passive: true });
    if (!reduced) raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", pointer);
    };
  }, []);

  const react = () => {
    setReacting(false);
    requestAnimationFrame(() => setReacting(true));
    window.setTimeout(() => setReacting(false), 720);
    if (audioEnabled && audio.current) void audio.current.play().catch(() => undefined);
  };

  return <section ref={root} className={`ct-encounter${reacting ? " is-reacting" : ""}`} role="region" aria-label="Living Encounter" data-asset-kind={asset.kind} data-particles={habitat.maxParticles} style={{ "--habitat-sky": habitat.sky, "--habitat-ground": habitat.ground, "--habitat-glow": habitat.glow } as React.CSSProperties}>
    <div className="ct-encounter-sky" aria-hidden="true"><i /><i /><i /></div>
    <div className={`ct-particles is-${habitat.particle}`} aria-hidden="true">{Array.from({ length: habitat.maxParticles }, (_, index) => <i key={index} style={{ "--i": index, left: `${(index * 37) % 100}%`, bottom: `${(index * 19) % 70}%` } as React.CSSProperties} />)}</div>
    <header className="ct-encounter-label"><span>Living Encounter</span><b>{pokemon.habitat ? pokemon.habitat.replaceAll("-", " ") : "open meadow"}</b></header>
    <button className="ct-creature" type="button" onClick={react} aria-label={`React with ${pokemon.name}`}>
      {asset.kind === "missing" ? <span>Visual unavailable</span> : asset.kind === "model" ? <span className="ct-model-loading" data-model-url={asset.url}>Approved 3D model</span> : <>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote PokeAPI GIF/PNG is selected at runtime and must remain lazy. */}
        <img src={asset.url} alt={`${pokemon.name} ${asset.kind === "animated" ? "animated sprite" : "official artwork"}`} draggable="false" loading="lazy" />
      </>}
    </button>
    <div className="ct-encounter-floor" aria-hidden="true" />
    <footer className="ct-encounter-controls">
      <div><span>#{String(pokemon.id).padStart(4, "0")}</span><h1>{pokemon.name}</h1><p>{asset.kind === "model" ? "Approved interactive 3D" : asset.kind === "animated" ? "Animated 2D sprite" : "Official 2D artwork"}</p></div>
      <button type="button" disabled={!pokemon.cryUrl} aria-label={audioEnabled ? "Disable cry audio" : "Enable cry audio"} aria-pressed={audioEnabled} onClick={() => setAudioEnabled((value) => !value)}>{audioEnabled ? "Sound on" : "Sound off"}</button>
    </footer>
    {pokemon.cryUrl ? <audio ref={audio} src={pokemon.cryUrl} preload="none" /> : null}
  </section>;
}
