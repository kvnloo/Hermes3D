"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { MuseumCameraAnchorV1, MuseumExhibitSlug } from "../core/MuseumExhibitV1";
import { MUSEUM_ARRIVAL_ANCHOR } from "../core/MuseumRuntimeV1";
import { validatedMuseumExhibits } from "../registry";

function CameraArbiter({ anchor, reducedMotion }: { anchor: MuseumCameraAnchorV1; reducedMotion: boolean }) {
  const { camera } = useThree();
  const cameraRef = useRef(camera);
  const position = useMemo(() => new THREE.Vector3(...anchor.position), [anchor.position]);
  const target = useMemo(() => new THREE.Vector3(...anchor.target), [anchor.target]);
  useEffect(() => {
    if (!reducedMotion) return;
    const controlledCamera = cameraRef.current;
    controlledCamera.position.copy(position);
    controlledCamera.lookAt(target);
    if (controlledCamera instanceof THREE.PerspectiveCamera) { controlledCamera.fov = anchor.fov; controlledCamera.updateProjectionMatrix(); }
  }, [anchor.fov, position, reducedMotion, target]);
  useFrame((_, delta) => {
    if (reducedMotion) return;
    const step = 1 - Math.exp(-Math.min(delta, 0.05) * 3.6);
    const controlledCamera = cameraRef.current;
    controlledCamera.position.lerp(position, step);
    controlledCamera.lookAt(target);
    if (controlledCamera instanceof THREE.PerspectiveCamera) { controlledCamera.fov = THREE.MathUtils.lerp(controlledCamera.fov, anchor.fov, step); controlledCamera.updateProjectionMatrix(); }
  });
  return null;
}

function ArrivalArchitecture() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[80, 80]} /><meshStandardMaterial color="#151b1d" roughness={0.92} /></mesh>
      <mesh position={[0, 2.8, -3]} castShadow><boxGeometry args={[7.6, 5.6, 0.32]} /><meshStandardMaterial color="#c9c4b5" roughness={0.78} /></mesh>
      <mesh position={[0, 2.2, -2.76]} castShadow><torusKnotGeometry args={[1.25, 0.28, 96, 12, 2, 3]} /><meshStandardMaterial color="#b86e3d" metalness={0.28} roughness={0.34} /></mesh>
      <mesh position={[-6, 1.4, 1]} castShadow><boxGeometry args={[0.35, 2.8, 7]} /><meshStandardMaterial color="#343a39" roughness={0.8} /></mesh>
      <mesh position={[6, 1.4, 1]} castShadow><boxGeometry args={[0.35, 2.8, 7]} /><meshStandardMaterial color="#343a39" roughness={0.8} /></mesh>
      <spotLight position={[0, 8, 4]} intensity={75} angle={0.48} penumbra={0.8} color="#f2d4aa" castShadow />
      <ambientLight intensity={0.42} color="#9ba6ad" />
    </group>
  );
}

export function MuseumCanvas({ activeSlug, reducedMotion, webglAvailable }: { activeSlug: MuseumExhibitSlug | null; reducedMotion: boolean; webglAvailable: boolean }) {
  const active = validatedMuseumExhibits.find(({ manifest }) => manifest.slug === activeSlug);
  const anchor = active?.manifest.cameraAnchors.approach ?? MUSEUM_ARRIVAL_ANCHOR;
  if (!webglAvailable) return <div className="museum-static-fallback" role="img" aria-label="Abstract museum entry sculpture"><div /></div>;
  return (
    <Canvas camera={{ position: [...MUSEUM_ARRIVAL_ANCHOR.position], fov: MUSEUM_ARRIVAL_ANCHOR.fov }} dpr={[1, 1.5]} shadows={!reducedMotion} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#0d1112"]} />
      <fog attach="fog" args={["#0d1112", 16, 48]} />
      <CameraArbiter anchor={anchor} reducedMotion={reducedMotion} />
      <ArrivalArchitecture />
      <Suspense fallback={null}>
        {validatedMuseumExhibits.map(({ manifest, Scene }) => <Scene key={manifest.id} active={manifest.slug === activeSlug} reducedMotion={reducedMotion} />)}
      </Suspense>
    </Canvas>
  );
}

export function useMuseumCapabilities() {
  const [capabilities, setCapabilities] = useState({ reducedMotion: true, webglAvailable: true });
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let webglAvailable = false;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglAvailable = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch { webglAvailable = false; }
    const update = () => setCapabilities({ reducedMotion: media.matches, webglAvailable });
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return capabilities;
}
