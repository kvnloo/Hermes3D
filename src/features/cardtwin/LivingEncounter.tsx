"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import Link from "next/link";
import type { Group } from "three";
import type { Pokemon3DAssetCatalogEntry } from "./pokemon3dCatalog";
import type { PokemonDetail } from "./providers/contracts";
import { habitatForPokemon, selectEncounterAsset } from "./livingEncounter";

const browserPreferenceFallback = () => false;

type EncounterRuntime = { owners: number; listeners: number; reactions: number };

function adjustRuntime(key: keyof EncounterRuntime, delta: number) {
  const runtimeWindow = window as typeof window & { __livingEncounterRuntime?: EncounterRuntime };
  const runtime = runtimeWindow.__livingEncounterRuntime ??= { owners: 0, listeners: 0, reactions: 0 };
  runtime[key] = Math.max(0, runtime[key] + delta);
}

function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener?.("change", onChange);
      return () => query.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    browserPreferenceFallback,
  );
}

function useDataSaver() {
  return useSyncExternalStore(
    () => () => undefined,
    () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData),
    browserPreferenceFallback,
  );
}

export function LivingEncounter({ pokemon, model }: { pokemon: PokemonDetail; model: Pokemon3DAssetCatalogEntry | null }) {
  const root = useRef<HTMLElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const reactionRaf = useRef(0);
  const reactionTimer = useRef(0);
  const reactionActive = useRef(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [shiny, setShiny] = useState(false);
  const reducedMotion = useReducedMotion();
  const saveData = useDataSaver();
  const habitat = useMemo(() => habitatForPokemon(pokemon.habitat, pokemon.types), [pokemon.habitat, pokemon.types]);
  const asset = selectEncounterAsset({ modelUrl: model?.modelUrl ?? null, animatedUrl: shiny ? null : pokemon.animatedSpriteUrl, artworkUrl: shiny ? pokemon.shinyArtworkUrl : pokemon.artworkUrl });


  useEffect(() => {
    const node = root.current;
    // R3F owns the sole render loop for promoted models. The DOM parallax loop
    // is only needed by sprite/artwork presentations.
    if (!node || reducedMotion || saveData || asset.kind === "model") return;
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
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
    adjustRuntime("listeners", 1);
    adjustRuntime("owners", 1);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", pointer);
      adjustRuntime("listeners", -1);
      adjustRuntime("owners", -1);
    };
  }, [asset.kind, reducedMotion, saveData]);

  useEffect(() => {
    if (asset.kind !== "model") return;
    adjustRuntime("owners", 1);
    return () => adjustRuntime("owners", -1);
  }, [asset.kind]);

  useEffect(() => () => {
    cancelAnimationFrame(reactionRaf.current);
    window.clearTimeout(reactionTimer.current);
    if (reactionActive.current) adjustRuntime("reactions", -1);
    reactionActive.current = false;
  }, []);

  const react = () => {
    setReacting(false);
    cancelAnimationFrame(reactionRaf.current);
    window.clearTimeout(reactionTimer.current);
    if (!reactionActive.current) {
      reactionActive.current = true;
      adjustRuntime("reactions", 1);
    }
    reactionRaf.current = requestAnimationFrame(() => setReacting(true));
    reactionTimer.current = window.setTimeout(() => {
      setReacting(false);
      reactionActive.current = false;
      adjustRuntime("reactions", -1);
    }, 720);
    if (!saveData && audioEnabled && audio.current) void audio.current.play().catch(() => undefined);
  };

  const particleCount = saveData ? 0 : habitat.maxParticles;
  return <section ref={root} className={`ct-encounter${reacting ? " is-reacting" : ""}`} role="region" aria-label="Living Encounter" data-asset-kind={asset.kind} data-particles={particleCount} style={{ "--habitat-sky": habitat.sky, "--habitat-ground": habitat.ground, "--habitat-glow": habitat.glow } as React.CSSProperties}>
    <div className="ct-encounter-sky" aria-hidden="true"><i /><i /><i /></div>
    <div className={`ct-particles is-${habitat.particle}`} aria-hidden="true">{Array.from({ length: particleCount }, (_, index) => <i key={index} style={{ "--i": index, left: `${(index * 37) % 100}%`, bottom: `${(index * 19) % 70}%` } as React.CSSProperties} />)}</div>
    <header className="ct-encounter-label"><span>Living Encounter</span><b>{pokemon.habitat ? pokemon.habitat.replaceAll("-", " ") : "open meadow"}</b></header>
    <button className="ct-creature" type="button" onClick={react} aria-label={`React with ${pokemon.name}`}>
      {asset.kind === "missing" ? <span>Visual unavailable</span> : asset.kind === "model" ? <ApprovedModel url={asset.url} reducedMotion={reducedMotion || saveData} /> : <>
        {/* eslint-disable-next-line @next/next/no-img-element -- remote PokeAPI GIF/PNG is selected at runtime and must remain lazy. */}
        <img src={asset.url} alt={`${pokemon.name} ${asset.kind === "animated" ? "animated sprite" : "official artwork"}`} draggable="false" loading="lazy" />
      </>}
    </button>
    <div className="ct-encounter-floor" aria-hidden="true" />
    <footer className="ct-encounter-controls">
      <div><span>#{String(pokemon.id).padStart(4, "0")}</span><h1>{pokemon.name}</h1><p>{asset.kind === "model" ? "Approved interactive 3D" : asset.kind === "animated" ? "Animated 2D sprite" : "Official 2D artwork"}</p></div>
      {pokemon.forms.length > 1 ? <nav className="ct-encounter-forms" aria-label="Forms">{pokemon.forms.map((form) => <Link key={form.id} href={`/pokedex/${form.id}`} aria-current={form.id === pokemon.id ? "page" : undefined}>{form.name}</Link>)}</nav> : null}
      {pokemon.shinyArtworkUrl ? <div className="ct-encounter-variants" aria-label="Appearance"><button type="button" aria-pressed={!shiny} onClick={() => setShiny(false)}>Original</button><button type="button" aria-pressed={shiny} onClick={() => setShiny(true)}>Shiny</button></div> : null}
      <button type="button" disabled={!pokemon.cryUrl || saveData} aria-label={saveData ? "Cry audio unavailable in data saver" : audioEnabled ? "Disable cry audio" : "Enable cry audio"} aria-pressed={audioEnabled} onClick={() => setAudioEnabled((value) => !value)}>{audioEnabled ? "Sound on" : "Sound off"}</button>
    </footer>
    {pokemon.cryUrl && !saveData ? <audio ref={audio} src={pokemon.cryUrl} preload="none" /> : null}
  </section>;
}

function ApprovedModel({ url, reducedMotion }: { url: string; reducedMotion: boolean }) {
  return <Canvas data-model-url={url} dpr={[1, 1.5]} camera={{ position: [0, 0.4, 3], fov: 38 }} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={1.1} />
    <directionalLight position={[3, 5, 4]} intensity={2.2} />
    <ModelObject url={url} reducedMotion={reducedMotion} />
    <OrbitControls enablePan={false} enableZoom={false} minAzimuthAngle={-0.55} maxAzimuthAngle={0.55} minPolarAngle={1.1} maxPolarAngle={1.75} />
  </Canvas>;
}

function ModelObject({ url, reducedMotion }: { url: string; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF(url);
  useFrame(({ clock }) => {
    if (!reducedMotion && group.current) group.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 0.035;
  });
  return <group ref={group}><primitive object={scene} /></group>;
}
