"use client";

import { Suspense } from "react";
import type { MuseumExhibitSlug } from "../core/MuseumExhibitV1";
import { validatedMuseumExhibits } from "../registry";

export const OFFICE_MUSEUM_ORIGIN = [28, 0, -10] as const;

export function OfficeMuseumRoom({ activeSlug, reducedMotion }: { activeSlug: MuseumExhibitSlug | null; reducedMotion: boolean }) {
  const activeExhibit = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === activeSlug);
  return (
    <group position={OFFICE_MUSEUM_ORIGIN} name="LivingMuseumAnnex">
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#252b2d" roughness={0.82} metalness={0.04} />
      </mesh>
      <mesh position={[0, 3.4, -7.5]} receiveShadow castShadow>
        <boxGeometry args={[18, 6.8, 0.35]} />
        <meshStandardMaterial color="#918d83" roughness={0.74} />
      </mesh>
      <mesh position={[-8.8, 3.4, 0]} receiveShadow><boxGeometry args={[0.35, 6.8, 15]} /><meshStandardMaterial color="#555b59" roughness={0.8} /></mesh>
      <mesh position={[8.8, 3.4, 0]} receiveShadow><boxGeometry args={[0.35, 6.8, 15]} /><meshStandardMaterial color="#555b59" roughness={0.8} /></mesh>
      {!activeSlug ? (
        <group name="MuseumArrivalArchitecture">
          <mesh position={[0, 2.15, -5.8]} castShadow><torusKnotGeometry args={[1.25, 0.28, 96, 12, 2, 3]} /><meshStandardMaterial color="#c87943" metalness={0.24} roughness={0.31} /></mesh>
          <pointLight position={[0, 4.8, -3.6]} intensity={22} distance={12} decay={2} color="#ffd3a3" />
        </group>
      ) : null}
      <hemisphereLight intensity={1.35} color="#dce8ef" groundColor="#4d4339" />
      <directionalLight position={[4, 8, 6]} intensity={2.4} color="#fff0d2" castShadow />
      <directionalLight position={[-5, 5, -2]} intensity={1.25} color="#8fc5ff" />
      <pointLight position={[0, 3.5, 4]} intensity={18} distance={16} decay={2} color="#f4c89e" />
      <Suspense fallback={null}>
        {activeExhibit ? <activeExhibit.Scene active reducedMotion={reducedMotion} /> : null}
      </Suspense>
    </group>
  );
}
