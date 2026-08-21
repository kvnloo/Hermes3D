"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { pokemonCardsManifest } from "./manifest";

export type PokemonCardsLodTier = MuseumExhibitV1["lod"][number]["tier"];

const TIER_INDEX: Record<PokemonCardsLodTier, number> = { hero: 0, near: 1, far: 2, sleep: 3 };
const INK = "#18232b";
const PAPER = "#d8ddd9";
const BRASS = "#b79050";
const JADE = "#47746b";
const PLUM = "#74546d";

/** Resolves any distance in one call while retaining the current tier inside its hysteresis band. */
export function selectPokemonCardsLod(
  distance: number,
  current: PokemonCardsLodTier,
): PokemonCardsLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";
  const band = pokemonCardsManifest.lod[TIER_INDEX[current]];
  if (distance >= band.enterDistance && distance <= band.exitDistance) return current;
  if (distance < pokemonCardsManifest.lod[0].exitDistance) return "hero";
  if (distance < pokemonCardsManifest.lod[1].exitDistance) return "near";
  if (distance < pokemonCardsManifest.lod[2].exitDistance) return "far";
  return "sleep";
}

export type PokemonCardsExhibitSceneProps = {
  active: boolean;
  distance: number;
  reducedMotion?: boolean;
  lodTier?: PokemonCardsLodTier;
};

function AbstractCard({
  position,
  rotation = [0, 0, 0],
  accent,
  detailed,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  accent: string;
  detailed: boolean;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[1.55, 2.15, 0.09]} />
        <meshStandardMaterial color={PAPER} roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.31, 0.052]}>
        <planeGeometry args={[1.18, 1.08]} />
        <meshStandardMaterial color={accent} roughness={0.58} />
      </mesh>
      <mesh position={[0, 0.31, 0.06]}>
        <torusGeometry args={[0.3, 0.075, 8, 20]} />
        <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.45} />
      </mesh>
      {detailed ? (
        <group position={[0, -0.48, 0.058]}>
          <mesh><boxGeometry args={[1.08, 0.07, 0.018]} /><meshStandardMaterial color={INK} /></mesh>
          <mesh position={[-0.27, -0.19, 0]}><boxGeometry args={[0.54, 0.055, 0.018]} /><meshStandardMaterial color={accent} /></mesh>
          <mesh position={[0.34, -0.19, 0]}><boxGeometry args={[0.46, 0.055, 0.018]} /><meshStandardMaterial color={INK} /></mesh>
        </group>
      ) : null}
    </group>
  );
}

function MemoryFolio({ animate, detailed }: { animate: boolean; detailed: boolean }) {
  const folio = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!animate || !folio.current) return;
    folio.current.rotation.y = Math.sin(folio.current.rotation.y + Math.min(delta, 0.05) * 0.16) * 0.035;
  });
  const cards = [
    [-3.4, 3.5, -0.25, JADE], [-1.7, 3.7, 0.05, PLUM], [0, 3.85, 0.18, JADE],
    [1.7, 3.7, 0.05, PLUM], [3.4, 3.5, -0.25, JADE], [-2.5, 1.45, 0.1, PLUM],
    [-0.85, 1.65, 0.28, JADE], [0.85, 1.65, 0.28, PLUM], [2.5, 1.45, 0.1, JADE],
  ] as const;
  return (
    <group ref={folio}>
      {cards.map(([x, y, z, accent], index) => (
        <AbstractCard key={`${x}:${y}`} position={[x, y, z]} rotation={[0, x * -0.025, (index - 4) * 0.012]} accent={accent} detailed={detailed} />
      ))}
    </group>
  );
}

export function PokemonCardsExhibitScene({
  active,
  distance,
  reducedMotion = false,
  lodTier,
}: PokemonCardsExhibitSceneProps) {
  const tier = lodTier ?? selectPokemonCardsLod(distance, "near");
  if (!active || tier === "sleep") {
    return <group name="pokemon-cards-exhibit-sleep"><mesh position={[0, 2.2, 0]}><boxGeometry args={[5.8, 4.4, 0.2]} /><meshStandardMaterial color={INK} roughness={1} /></mesh></group>;
  }
  const detailed = tier === "hero" || tier === "near";
  return (
    <group name="pokemon-cards-exhibit-active">
      <mesh position={[0, 2.65, -0.45]} receiveShadow><boxGeometry args={[10.2, 6.2, 0.32]} /><meshStandardMaterial color={INK} roughness={0.86} /></mesh>
      <mesh position={[0, 2.65, -0.25]}><boxGeometry args={[9.4, 5.45, 0.08]} /><meshStandardMaterial color="#25343c" roughness={0.7} /></mesh>
      <MemoryFolio animate={active && tier === "hero" && !reducedMotion} detailed={detailed} />
      {detailed ? (
        <group>
          <mesh position={[0, 0.18, 1.15]} receiveShadow><boxGeometry args={[11, 0.34, 3.4]} /><meshStandardMaterial color="#34483f" roughness={0.92} /></mesh>
          <mesh position={[-4.8, 1.25, 0.15]}><cylinderGeometry args={[0.08, 0.08, 2.5, 12]} /><meshStandardMaterial color={BRASS} metalness={0.5} /></mesh>
          <mesh position={[4.8, 1.25, 0.15]}><cylinderGeometry args={[0.08, 0.08, 2.5, 12]} /><meshStandardMaterial color={BRASS} metalness={0.5} /></mesh>
        </group>
      ) : null}
    </group>
  );
}
