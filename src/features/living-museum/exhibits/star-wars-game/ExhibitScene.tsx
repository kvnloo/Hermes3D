"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { starWarsGameManifest } from "./manifest";

export type StarWarsGameLodTier = MuseumExhibitV1["lod"][number]["tier"];

const TIER_INDEX: Record<StarWarsGameLodTier, number> = {
  hero: 0,
  near: 1,
  far: 2,
  sleep: 3,
};

/** Resolves arbitrary distance jumps while preserving manifest hysteresis. */
export function selectStarWarsGameLod(
  distance: number,
  current: StarWarsGameLodTier,
): StarWarsGameLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";

  let index = TIER_INDEX[current];
  const currentBand = starWarsGameManifest.lod[index];

  if (index > 0 && distance <= currentBand.enterDistance) {
    while (index > 0 && distance <= starWarsGameManifest.lod[index].enterDistance) {
      index -= 1;
    }
    return starWarsGameManifest.lod[index].tier;
  }
  if (
    index < starWarsGameManifest.lod.length - 1 &&
    distance >= currentBand.exitDistance
  ) {
    while (
      index < starWarsGameManifest.lod.length - 1 &&
      distance >= starWarsGameManifest.lod[index].exitDistance
    ) {
      index += 1;
    }
    return starWarsGameManifest.lod[index].tier;
  }
  return current;
}

export type StarWarsGameExhibitSceneProps = {
  active: boolean;
  distance: number;
  reducedMotion?: boolean;
  milestoneActive?: boolean;
  lodTier?: StarWarsGameLodTier;
};

const SIGNAL_COLOR = "#caa85e";
const GRAPHITE_COLOR = "#252c35";
const FLOOR_COLOR = "#48545f";

function SignalForge({ animate, milestoneActive }: { animate: boolean; milestoneActive: boolean }) {
  const planes = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!animate || !planes.current) return;
    const speed = milestoneActive ? 0.32 : 0.12;
    planes.current.rotation.y =
      (planes.current.rotation.y + Math.min(delta, 0.05) * speed) % (Math.PI * 2);
  });

  return (
    <group>
      <mesh position={[0, 1.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.82, 3.6, 10]} />
        <meshStandardMaterial color={GRAPHITE_COLOR} roughness={0.68} metalness={0.12} />
      </mesh>
      <group ref={planes} position={[0, 3, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0.18]} castShadow>
          <torusGeometry args={[2.7, 0.15, 8, 36]} />
          <meshStandardMaterial color={SIGNAL_COLOR} roughness={0.4} metalness={0.24} />
        </mesh>
        <mesh rotation={[0.72, 0.22, 0]} castShadow>
          <torusGeometry args={[2, 0.11, 8, 30]} />
          <meshStandardMaterial color={SIGNAL_COLOR} roughness={0.46} metalness={0.16} />
        </mesh>
        <mesh rotation={[-0.48, 0.56, 0]} castShadow>
          <torusGeometry args={[1.25, 0.09, 8, 24]} />
          <meshStandardMaterial color={SIGNAL_COLOR} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}

function SignalMarkers({ detailed }: { detailed: boolean }) {
  const markers = detailed
    ? ([[-5.2, 0.35, 3.2], [4.6, 0.35, 4.1], [5.4, 0.35, -3.7]] as const)
    : ([[-5.2, 0.35, 3.2]] as const);

  return (
    <group>
      {markers.map((position, index) => (
        <mesh key={position.join(":")} position={position} rotation={[0, index * 0.7, 0]} castShadow>
          <tetrahedronGeometry args={[0.58, 0]} />
          <meshStandardMaterial color={SIGNAL_COLOR} roughness={0.56} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Original primitive-only diorama. The shell owns camera arbitration, labels,
 * lighting and state timing. This leaf owns geometry and deterministic sleep.
 */
export function StarWarsGameExhibitScene({
  active,
  distance,
  reducedMotion = false,
  milestoneActive = false,
  lodTier,
}: StarWarsGameExhibitSceneProps) {
  const tier = lodTier ?? selectStarWarsGameLod(distance, "near");
  const sleeping = !active || tier === "sleep";

  if (sleeping) {
    return (
      <group name="star-wars-game-exhibit-sleep">
        <mesh position={[0, 1.8, 0]}>
          <cylinderGeometry args={[0.7, 1.5, 3.6, 6]} />
          <meshStandardMaterial color={GRAPHITE_COLOR} roughness={1} />
        </mesh>
      </group>
    );
  }

  const detailed = tier === "hero" || tier === "near";

  return (
    <group name="star-wars-game-exhibit-active">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[tier === "far" ? 8 : 10, tier === "far" ? 16 : 36]} />
        <meshStandardMaterial color={FLOOR_COLOR} roughness={0.96} />
      </mesh>
      <SignalForge
        animate={active && tier === "hero" && !reducedMotion}
        milestoneActive={milestoneActive}
      />
      <SignalMarkers detailed={detailed} />
      {detailed ? (
        <group>
          <mesh position={[-3.4, 0.5, -3.8]} rotation={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[2.2, 1, 1.25]} />
            <meshStandardMaterial color={GRAPHITE_COLOR} roughness={0.88} />
          </mesh>
          <mesh position={[3.2, 0.6, -3]} rotation={[0, -0.52, 0]} castShadow>
            <icosahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={GRAPHITE_COLOR} roughness={0.84} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}
