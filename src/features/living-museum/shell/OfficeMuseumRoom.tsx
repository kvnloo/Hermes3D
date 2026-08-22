"use client";

import { Suspense } from "react";
import type { MuseumExhibitSlug } from "../core/MuseumExhibitV1";
import { validatedMuseumExhibits } from "../registry";

export const OFFICE_MUSEUM_ORIGIN = [28, 0, -10] as const;

export const MUSEUM_ANNEX_BLUEPRINT = {
  doorway: { center: [-12, 2.7, 0] as const, width: 5.6, height: 5.4 },
  corridor: { center: [-9.8, 0, 0] as const, width: 4.6, depth: 8.4, height: 4.8 },
  gallery: { center: [0, 0, 0] as const, width: 18, depth: 18, height: 6.8, entryWidth: 5.2 },
} as const;

export const MUSEUM_CAMERA_TRAVEL = [
  { stage: "office-sightline", position: [-30, 20, 18] as const, target: [-12, 1.2, 0] as const, durationMs: 900 },
  { stage: "threshold", position: [-26, 17, 15] as const, target: [-10, 1.4, 0] as const, durationMs: 900 },
  { stage: "corridor", position: [-23, 14, 13] as const, target: [-8, 1.5, 0] as const, durationMs: 850 },
  { stage: "annex-arrival", position: [-21, 12, 11] as const, target: [-6, 1.6, 0] as const, durationMs: 1_050 },
] as const;

type MuseumLightRig = {
  key: string;
  fill: string;
  rim: string;
};

export const MUSEUM_EXHIBIT_LIGHTING: Record<MuseumExhibitSlug, MuseumLightRig> = {
  "pokemon-cards": { key: "#ffe0ad", fill: "#9bc7b0", rim: "#d9a85f" },
  "pokemon-game": { key: "#f7d6a0", fill: "#8fc5b0", rim: "#d89b5f" },
  "star-wars-game": { key: "#f2dcc0", fill: "#83a9c9", rim: "#bf7d52" },
  "call-of-duty": { key: "#f0d2aa", fill: "#91a69e", rim: "#d18a55" },
  halo: { key: "#e8e4cf", fill: "#78b7c7", rim: "#b7a55c" },
  "obsidian-vault": { key: "#eadac5", fill: "#879eb8", rim: "#b88a65" },
};

function MuseumLightRig({ rig, arrival = false }: { rig: MuseumLightRig; arrival?: boolean }) {
  return (
    <group name={arrival ? "MuseumArrivalLightRig" : "MuseumActiveExhibitLightRig"}>
      <pointLight position={[-4.5, 6.5, 5.5]} intensity={arrival ? 42 : 58} distance={15} decay={2} color={rig.key} castShadow={!arrival} />
      <pointLight position={[4.8, 3.8, 3]} intensity={arrival ? 28 : 38} distance={13} decay={2} color={rig.fill} />
      <pointLight position={[0, 5.2, -4.5]} intensity={arrival ? 34 : 46} distance={12} decay={2} color={rig.rim} />
    </group>
  );
}

export function OfficeMuseumRoom({ active, activeSlug, reducedMotion }: { active: boolean; activeSlug: MuseumExhibitSlug | null; reducedMotion: boolean }) {
  const activeExhibit = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === activeSlug);
  return (
    <group position={OFFICE_MUSEUM_ORIGIN} name="LivingMuseumAnnex">
      <mesh name="MuseumAnnexFloor" rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#465052" roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[0, 1.8, -7.5]} receiveShadow castShadow>
        <boxGeometry args={[18, 3.6, 0.35]} />
        <meshStandardMaterial color="#918d83" roughness={0.74} />
      </mesh>
      <mesh position={[-8.8, 1.2, -5.1]} receiveShadow><boxGeometry args={[0.35, 2.4, 4.8]} /><meshStandardMaterial color="#555b59" roughness={0.8} /></mesh>
      <mesh position={[-8.8, 1.2, 5.1]} receiveShadow><boxGeometry args={[0.35, 2.4, 4.8]} /><meshStandardMaterial color="#555b59" roughness={0.8} /></mesh>
      <mesh position={[8.8, 1.2, 0]} receiveShadow><boxGeometry args={[0.35, 2.4, 15]} /><meshStandardMaterial color="#555b59" roughness={0.8} /></mesh>
      <group name="MuseumAnnexCorridor" position={MUSEUM_ANNEX_BLUEPRINT.corridor.center}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[MUSEUM_ANNEX_BLUEPRINT.corridor.depth, MUSEUM_ANNEX_BLUEPRINT.corridor.width]} /><meshStandardMaterial color="#5f6664" roughness={0.8} /></mesh>
        <mesh position={[0, 0.7, -2.3]} castShadow receiveShadow><boxGeometry args={[MUSEUM_ANNEX_BLUEPRINT.corridor.depth, 1.4, 0.3]} /><meshStandardMaterial color="#6e716c" roughness={0.78} /></mesh>
        <mesh position={[0, 0.7, 2.3]} castShadow receiveShadow><boxGeometry args={[MUSEUM_ANNEX_BLUEPRINT.corridor.depth, 1.4, 0.3]} /><meshStandardMaterial color="#6e716c" roughness={0.78} /></mesh>
        <pointLight position={[0, 3.8, 0]} intensity={30} distance={8} decay={2} color="#ffd9a6" />
      </group>
      <group name="MuseumAnnexThreshold" position={MUSEUM_ANNEX_BLUEPRINT.doorway.center}>
        <mesh position={[0, 0, -3.05]} castShadow receiveShadow><boxGeometry args={[0.7, 5.4, 0.7]} /><meshStandardMaterial color="#9b704b" roughness={0.54} /></mesh>
        <mesh position={[0, 0, 3.05]} castShadow receiveShadow><boxGeometry args={[0.7, 5.4, 0.7]} /><meshStandardMaterial color="#9b704b" roughness={0.54} /></mesh>
        <mesh position={[0, 3.05, 0]} castShadow receiveShadow><boxGeometry args={[0.7, 0.7, 6.8]} /><meshStandardMaterial color="#b18258" roughness={0.5} /></mesh>
        <pointLight position={[0.8, 1.8, 0]} intensity={32} distance={9} decay={2} color="#ffd9a6" />
      </group>
      <group name="OfficeLandmarkSightline" position={[-14.4, 0, 0]}>
        <mesh position={[0, 0.75, -2.8]} castShadow><boxGeometry args={[3.2, 0.18, 1.35]} /><meshStandardMaterial color="#7f5b40" roughness={0.7} /></mesh>
        <mesh position={[0, 0.35, -2.8]} castShadow><boxGeometry args={[0.3, 0.7, 0.3]} /><meshStandardMaterial color="#4d5556" roughness={0.8} /></mesh>
        <mesh position={[-0.3, 1.15, 3]} castShadow><cylinderGeometry args={[0.9, 1.15, 2.3, 12]} /><meshStandardMaterial color="#4f765d" roughness={0.86} /></mesh>
      </group>
      {active && !activeSlug ? (
        <group name="MuseumArrivalArchitecture">
          <mesh position={[0, 2.15, -5.8]} castShadow><torusKnotGeometry args={[1.25, 0.28, 96, 12, 2, 3]} /><meshStandardMaterial color="#c87943" metalness={0.24} roughness={0.31} /></mesh>
          <MuseumLightRig rig={{ key: "#ffe0b7", fill: "#9ab7b2", rim: "#c98254" }} arrival />
        </group>
      ) : null}
      {activeSlug ? <MuseumLightRig rig={MUSEUM_EXHIBIT_LIGHTING[activeSlug]} /> : null}
      <Suspense fallback={null}>
        {active && activeExhibit ? <activeExhibit.Scene active reducedMotion={reducedMotion} /> : null}
      </Suspense>
    </group>
  );
}
