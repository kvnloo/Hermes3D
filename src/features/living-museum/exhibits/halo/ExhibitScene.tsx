"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { haloManifest } from "./manifest";

export type HaloLodTier = MuseumExhibitV1["lod"][number]["tier"];

const TIER_INDEX: Record<HaloLodTier, number> = { hero: 0, near: 1, far: 2, sleep: 3 };

/** Resolves multi-band distance jumps while retaining hysteresis at each boundary. */
export function selectHaloLod(distance: number, current: HaloLodTier): HaloLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";

  let index = TIER_INDEX[current];
  if (index > 0 && distance <= haloManifest.lod[index].enterDistance) {
    while (index > 0 && distance <= haloManifest.lod[index].enterDistance) index -= 1;
    return haloManifest.lod[index].tier;
  }
  if (index < haloManifest.lod.length - 1 && distance >= haloManifest.lod[index].exitDistance) {
    while (
      index < haloManifest.lod.length - 1 &&
      distance >= haloManifest.lod[index].exitDistance
    ) index += 1;
    return haloManifest.lod[index].tier;
  }
  return current;
}

export type HaloExhibitSceneProps = {
  active: boolean;
  distance: number;
  reducedMotion?: boolean;
  milestoneActive?: boolean;
  lodTier?: HaloLodTier;
};

const GRAPHITE = "#27313a";
const STONE = "#58656d";
const ACCENT = "#79a89b";
const LIGHT = "#c9d9d4";

function ConvergenceWell({ animate, milestone }: { animate: boolean; milestone: boolean }) {
  const bands = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!animate || !bands.current) return;
    const speed = milestone ? 0.28 : 0.08;
    bands.current.rotation.y =
      (bands.current.rotation.y + Math.min(delta, 0.05) * speed) % (Math.PI * 2);
  });

  return (
    <group>
      <mesh position={[0, 0.55, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.1, 3.5, 1.1, 12]} />
        <meshStandardMaterial color={GRAPHITE} roughness={0.78} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.15, 2.55, 32]} />
        <meshStandardMaterial color={ACCENT} roughness={0.5} metalness={0.16} />
      </mesh>
      <group ref={bands} position={[0, 3.65, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0.32]} castShadow>
          <torusGeometry args={[3.05, 0.18, 8, 40, Math.PI * 1.45]} />
          <meshStandardMaterial color={LIGHT} roughness={0.42} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, Math.PI + 0.32]} castShadow>
          <torusGeometry args={[2.35, 0.13, 8, 34, Math.PI * 1.25]} />
          <meshStandardMaterial color={ACCENT} roughness={0.48} metalness={0.12} />
        </mesh>
      </group>
    </group>
  );
}

function RouteArchitecture({ detailed }: { detailed: boolean }) {
  const pylons = [
    [-6.3, 1.4, -4.8, 0.5], [5.8, 1.4, -5.4, -0.45], [-5.5, 1.4, 5.5, -0.6], [6.4, 1.4, 4.6, 0.62],
  ] as const;
  return (
    <group>
      {pylons.map(([x, y, z, rotation], index) => (
        <group key={`${x}:${z}`} position={[x, y, z]} rotation={[0, rotation, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[2.3, 2.8 + (index % 2) * 0.8, 1.5]} />
            <meshStandardMaterial color={index % 2 ? STONE : GRAPHITE} roughness={0.86} />
          </mesh>
          {detailed ? (
            <mesh position={[0, 1.55 + (index % 2) * 0.4, 0.78]}>
              <boxGeometry args={[1.1, 0.13, 0.08]} />
              <meshStandardMaterial color={ACCENT} roughness={0.4} />
            </mesh>
          ) : null}
        </group>
      ))}
      {detailed ? (
        <group>
          <mesh position={[-4, 1.05, 0]} rotation={[0, 0, -0.16]} castShadow>
            <boxGeometry args={[4.2, 0.42, 1.45]} />
            <meshStandardMaterial color={STONE} roughness={0.82} />
          </mesh>
          <mesh position={[4, 1.05, 0]} rotation={[0, 0, 0.16]} castShadow>
            <boxGeometry args={[4.2, 0.42, 1.45]} />
            <meshStandardMaterial color={STONE} roughness={0.82} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
}

/** Original primitive-only arena. Camera, labels, lighting and state timing remain shell-owned. */
export function HaloExhibitScene({
  active,
  distance,
  reducedMotion = false,
  milestoneActive = false,
  lodTier,
}: HaloExhibitSceneProps) {
  const tier = lodTier ?? selectHaloLod(distance, "near");
  if (!active || tier === "sleep") {
    return (
      <group name="halo-exhibit-sleep">
        <mesh position={[0, 1.1, 0]}>
          <cylinderGeometry args={[3, 3.5, 2.2, 8]} />
          <meshStandardMaterial color={GRAPHITE} roughness={1} />
        </mesh>
      </group>
    );
  }

  const detailed = tier === "hero" || tier === "near";
  return (
    <group name="halo-exhibit-active">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[tier === "far" ? 10 : 13, tier === "far" ? 16 : 40]} />
        <meshStandardMaterial color="#38434a" roughness={0.98} />
      </mesh>
      <ConvergenceWell
        animate={active && tier === "hero" && !reducedMotion}
        milestone={milestoneActive}
      />
      <RouteArchitecture detailed={detailed} />
    </group>
  );
}
