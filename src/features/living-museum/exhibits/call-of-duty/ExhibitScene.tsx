"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { callOfDutyManifest } from "./manifest";

export type CallOfDutyLodTier = MuseumExhibitV1["lod"][number]["tier"];
const TIER_INDEX: Record<CallOfDutyLodTier, number> = { hero: 0, near: 1, far: 2, sleep: 3 };

export function selectCallOfDutyLod(distance: number, current: CallOfDutyLodTier): CallOfDutyLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";
  let index = TIER_INDEX[current];
  if (index > 0 && distance <= callOfDutyManifest.lod[index].enterDistance) {
    while (index > 0 && distance <= callOfDutyManifest.lod[index].enterDistance) index -= 1;
  } else if (index < 3 && distance >= callOfDutyManifest.lod[index].exitDistance) {
    while (index < 3 && distance >= callOfDutyManifest.lod[index].exitDistance) index += 1;
  }
  return callOfDutyManifest.lod[index].tier;
}

export type CallOfDutyExhibitSceneProps = { active: boolean; distance: number; reducedMotion?: boolean; milestoneActive?: boolean; lodTier?: CallOfDutyLodTier };
const GRAPHITE = "#252a2c";
const CONCRETE = "#687075";
const SIGNAL = "#d08c47";
const ROUTE = "#8eaa9a";

function RouteTable({ animate, milestone }: { animate: boolean; milestone: boolean }) {
  const routes = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!animate || !routes.current) return;
    routes.current.rotation.y = (routes.current.rotation.y + Math.min(delta, 0.05) * (milestone ? 0.28 : 0.08)) % (Math.PI * 2);
  });
  return <group>
    <mesh position={[0, 0.65, 0]} castShadow><cylinderGeometry args={[3.2, 3.5, 0.7, 8]} /><meshStandardMaterial color={GRAPHITE} roughness={0.78} metalness={0.08} /></mesh>
    <group ref={routes} position={[0, 1.25, 0]}>
      {[0, 2.1, 4.2].map((rotation, index) => <mesh key={rotation} rotation={[Math.PI / 2, rotation, 0]} position={[0, index * 0.12, 0]} castShadow><torusGeometry args={[1.35 + index * 0.48, 0.07, 6, 24]} /><meshStandardMaterial color={index === 1 ? SIGNAL : ROUTE} roughness={0.5} /></mesh>)}
      <mesh position={[0, 0.5, 0]} castShadow><octahedronGeometry args={[0.52, 0]} /><meshStandardMaterial color={SIGNAL} roughness={0.4} /></mesh>
    </group>
  </group>;
}

function TrainingGround({ detailed }: { detailed: boolean }) {
  const cover = detailed
    ? [[-6, 0.8, -3, 2.8, 1.6, 1.3], [-5, 1.15, 4, 1.4, 2.3, 3], [5.5, 0.7, 3.6, 3.2, 1.4, 1.2], [6, 1, -4, 1.5, 2, 3.2], [0, 0.55, -6.4, 4.2, 1.1, 1]]
    : [[-5, 0.8, -3, 3, 1.6, 1.3], [5, 0.7, 3, 3.2, 1.4, 1.2]];
  return <group>{cover.map(([x, y, z, w, h, d], index) => <mesh key={index} position={[x, y, z]} rotation={[0, index % 2 ? -0.28 : 0.22, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={index % 2 ? CONCRETE : GRAPHITE} roughness={0.9} /></mesh>)}
    {detailed ? [[-7, 0.25, 6], [7, 0.25, 6], [-7, 0.25, -6], [7, 0.25, -6]].map((position, index) => <mesh key={index} position={position as [number, number, number]} castShadow><coneGeometry args={[0.3, 0.5, 5]} /><meshStandardMaterial color={SIGNAL} roughness={0.62} /></mesh>) : null}
  </group>;
}

export function CallOfDutyExhibitScene({ active, distance, reducedMotion = false, milestoneActive = false, lodTier }: CallOfDutyExhibitSceneProps) {
  const tier = lodTier ?? selectCallOfDutyLod(distance, "near");
  if (!active || tier === "sleep") return <group name="call-of-duty-exhibit-sleep"><mesh position={[0, 0.55, 0]}><boxGeometry args={[7, 1.1, 5]} /><meshStandardMaterial color={GRAPHITE} roughness={1} /></mesh></group>;
  const detailed = tier === "hero" || tier === "near";
  return <group name="call-of-duty-exhibit-active">
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[tier === "far" ? 10 : 14, tier === "far" ? 16 : 40]} /><meshStandardMaterial color="#3d4443" roughness={0.98} /></mesh>
    <RouteTable animate={active && tier === "hero" && !reducedMotion} milestone={milestoneActive} />
    <TrainingGround detailed={detailed} />
  </group>;
}
