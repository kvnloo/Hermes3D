"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { pokemonGameManifest } from "./manifest";

export type PokemonGameLodTier = MuseumExhibitV1["lod"][number]["tier"];

const TIER_INDEX: Record<PokemonGameLodTier, number> = {
  hero: 0,
  near: 1,
  far: 2,
  sleep: 3,
};

/** Selects a tier with manifest-authored hysteresis and no ambient state. */
export function selectPokemonGameLod(
  distance: number,
  current: PokemonGameLodTier,
): PokemonGameLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";

  const currentIndex = TIER_INDEX[current];
  const currentBand = pokemonGameManifest.lod[currentIndex];

  if (currentIndex > 0 && distance <= currentBand.enterDistance) {
    return pokemonGameManifest.lod[currentIndex - 1].tier;
  }
  if (
    currentIndex < pokemonGameManifest.lod.length - 1 &&
    distance >= currentBand.exitDistance
  ) {
    return pokemonGameManifest.lod[currentIndex + 1].tier;
  }
  return current;
}

export type PokemonGameExhibitSceneProps = {
  active: boolean;
  distance: number;
  reducedMotion?: boolean;
  lodTier?: PokemonGameLodTier;
};

const ROUTE_COLOR = "#d9a441";
const STONE_COLOR = "#27323a";
const FIELD_COLOR = "#607d67";

function Wayfinder({ animate }: { animate: boolean }) {
  const orbit = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!animate || !orbit.current) return;
    orbit.current.rotation.y =
      (orbit.current.rotation.y + Math.min(delta, 0.05) * 0.18) % (Math.PI * 2);
  });

  return (
    <group>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.72, 3, 8]} />
        <meshStandardMaterial color={STONE_COLOR} roughness={0.72} metalness={0.08} />
      </mesh>
      <group ref={orbit} position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh castShadow>
          <torusGeometry args={[2.25, 0.16, 8, 32]} />
          <meshStandardMaterial color={ROUTE_COLOR} roughness={0.42} metalness={0.2} />
        </mesh>
        <mesh rotation={[0.62, 0, 0]} castShadow>
          <torusGeometry args={[1.55, 0.1, 8, 24]} />
          <meshStandardMaterial color={ROUTE_COLOR} roughness={0.48} />
        </mesh>
      </group>
    </group>
  );
}

function RouteMarkers({ detail }: { detail: boolean }) {
  const markers = detail
    ? ([[-4.5, 0.25, 2.8], [3.8, 0.25, 3.4], [4.6, 0.25, -3.1]] as const)
    : ([[-4.5, 0.25, 2.8]] as const);

  return (
    <group>
      {markers.map((position) => (
        <mesh key={position.join(":")} position={position} castShadow>
          <octahedronGeometry args={[0.42, 0]} />
          <meshStandardMaterial color={ROUTE_COLOR} roughness={0.58} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Original primitive-only diorama. The shell owns camera arbitration, lighting,
 * labels, sound and activation; this leaf owns only exhibit geometry and its
 * deterministic inactive suspension.
 */
export function PokemonGameExhibitScene({
  active,
  distance,
  reducedMotion = false,
  lodTier,
}: PokemonGameExhibitSceneProps) {
  const tier = lodTier ?? selectPokemonGameLod(distance, "near");
  const sleeping = !active || tier === "sleep";

  if (sleeping) {
    return (
      <group name="pokemon-game-exhibit-sleep">
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.6, 1.4, 3, 6]} />
          <meshStandardMaterial color={STONE_COLOR} roughness={1} />
        </mesh>
      </group>
    );
  }

  const detailed = tier === "hero" || tier === "near";

  return (
    <group name="pokemon-game-exhibit-active">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[tier === "far" ? 7 : 9, tier === "far" ? 16 : 32]} />
        <meshStandardMaterial color={FIELD_COLOR} roughness={0.94} />
      </mesh>
      <Wayfinder animate={active && tier === "hero" && !reducedMotion} />
      <RouteMarkers detail={detailed} />
      {detailed ? (
        <group>
          <mesh position={[-2.8, 0.3, -3.2]} rotation={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[1.8, 0.6, 1.1]} />
            <meshStandardMaterial color={STONE_COLOR} roughness={0.9} />
          </mesh>
          <mesh position={[2.6, 0.45, -2.5]} rotation={[0, -0.5, 0]} castShadow>
            <dodecahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color={STONE_COLOR} roughness={0.86} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
