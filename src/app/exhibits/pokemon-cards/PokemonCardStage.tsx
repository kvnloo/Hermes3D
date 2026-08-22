"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { premiumCardConstructions } from "@/features/living-museum/exhibits/pokemon-cards/constructions";

type Variant = "astral" | "verdant" | "ember";

const palettes = {
  astral: ["#07162d", "#113451", "#1b6072", "#8dcbd1", "#d9b66d"],
  verdant: ["#071a12", "#123622", "#235833", "#609252", "#c4a967"],
  ember: ["#130707", "#32100b", "#66200e", "#b94b16", "#f2a83b"],
} as const;

function ResponsiveCamera({ view }: { view: "gallery" | "macro" | "side" }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const orthographic = camera as THREE.OrthographicCamera;
    const nextZoom = view === "gallery" ? (size.width < 700 ? 42 : Math.min(145, size.width / 10.5)) : view === "macro" ? 165 : 235;
    if (orthographic.zoom !== nextZoom) {
      // eslint-disable-next-line react-hooks/immutability -- Three camera is intentionally imperative frame state.
      orthographic.zoom = nextZoom;
      orthographic.updateProjectionMatrix();
    }
  });
  return null;
}

function Foil({ color = "#cda85c" }: { color?: string }) {
  return <meshPhysicalMaterial color={color} metalness={0.92} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} iridescence={0.9} iridescenceIOR={1.8} />;
}

function Frame({ z, color }: { z: number; color: string }) {
  return <group position-z={z}>
    <RoundedBox args={[2.36, 3.36, 0.08]} radius={0.11} smoothness={4}><meshStandardMaterial color="#281d12" roughness={0.58} /></RoundedBox>
    <RoundedBox args={[2.08, 3.06, 0.1]} radius={0.08} smoothness={4} position-z={0.06}><Foil color={color} /></RoundedBox>
    <RoundedBox args={[1.82, 2.74, 0.12]} radius={0.07} smoothness={4} position-z={0.13}><meshStandardMaterial color="#0a0b0b" roughness={0.85} /></RoundedBox>
  </group>;
}

function AstralSubject() {
  return <group position={[0, -0.04, 0.7]}>
    <mesh><torusGeometry args={[0.53, 0.055, 12, 64]} /><Foil color="#8fcfd4" /></mesh>
    <mesh rotation-z={0.62}><torusGeometry args={[0.38, 0.027, 10, 48]} /><Foil color="#e0be73" /></mesh>
    <mesh position={[0, 0.03, 0.08]}><icosahedronGeometry args={[0.23, 2]} /><meshPhysicalMaterial color="#a8d8ee" emissive="#2d7797" emissiveIntensity={0.5} roughness={0.24} /></mesh>
    <mesh position={[0, -0.92, -0.04]}><boxGeometry args={[1.35, 0.12, 0.18]} /><meshStandardMaterial color="#cdb67d" roughness={0.5} /></mesh>
    {[-0.52, 0, 0.52].map((x) => <mesh key={x} position={[x, -0.55, -0.02]}><boxGeometry args={[0.15, 0.75, 0.16]} /><meshStandardMaterial color="#bea66d" roughness={0.64} /></mesh>)}
  </group>;
}

function VerdantSubject() {
  return <group position={[0, -0.08, 0.66]}>
    <mesh position={[0, -0.42, 0]}><capsuleGeometry args={[0.26, 0.54, 8, 16]} /><meshStandardMaterial color="#d0c083" roughness={0.72} /></mesh>
    <mesh position={[0, 0.1, 0.02]}><sphereGeometry args={[0.32, 24, 18]} /><meshStandardMaterial color="#e1d39a" roughness={0.65} /></mesh>
    <mesh position={[-0.12, 0.18, 0.28]}><sphereGeometry args={[0.035]} /><meshBasicMaterial color="#18251a" /></mesh>
    <mesh position={[0.12, 0.18, 0.28]}><sphereGeometry args={[0.035]} /><meshBasicMaterial color="#18251a" /></mesh>
    {[-0.74, -0.52, 0.52, 0.74].map((x, i) => <mesh key={x} position={[x, -0.25 + (i % 2) * 0.28, -0.08]} rotation-z={x < 0 ? -0.35 : 0.35}><coneGeometry args={[0.28, 1.15, 7]} /><meshStandardMaterial color={i % 2 ? "#2d6b38" : "#17472b"} roughness={0.9} /></mesh>)}
  </group>;
}

function EmberSubject() {
  return <group position={[0, -0.02, 1.02]}>
    <mesh rotation-z={-0.55} position={[-0.38, 0.1, 0]}><coneGeometry args={[0.46, 1.45, 5]} /><meshPhysicalMaterial color="#df541c" emissive="#8b1705" emissiveIntensity={0.45} roughness={0.5} /></mesh>
    <mesh rotation-z={0.55} position={[0.38, 0.1, 0]}><coneGeometry args={[0.46, 1.45, 5]} /><meshPhysicalMaterial color="#f08325" emissive="#9b2606" emissiveIntensity={0.5} roughness={0.46} /></mesh>
    <mesh position={[0, -0.22, 0.12]}><capsuleGeometry args={[0.2, 0.72, 8, 20]} /><meshStandardMaterial color="#f0a13b" roughness={0.52} /></mesh>
    <mesh position={[0, 0.44, 0.1]}><coneGeometry args={[0.2, 0.54, 5]} /><Foil color="#ffd072" /></mesh>
    <mesh position={[0, -0.92, -0.18]} rotation-z={Math.PI}><coneGeometry args={[0.38, 0.88, 7]} /><meshPhysicalMaterial color="#c73710" emissive="#6f1003" emissiveIntensity={0.7} /></mesh>
  </group>;
}

function Card({ variant, index, reduced, view }: { variant: Variant; index: number; reduced: boolean; view: "gallery" | "macro" | "side" }) {
  const root = useRef<THREE.Group>(null);
  const model = premiumCardConstructions[index];
  const colors = palettes[variant];
  const focused = view !== "gallery";
  const x = focused ? 0 : (index - 1) * 3.05;
  useFrame(({ clock, pointer }) => {
    if (!root.current || reduced) return;
    const targetY = view === "side" ? 1.38 : pointer.x * 0.11 + (index - 1) * -0.05;
    root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, targetY, 0.05);
    root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, -pointer.y * 0.07 + Math.sin(clock.elapsedTime * 0.5 + index) * 0.018, 0.05);
  });
  const planes = useMemo(() => model.layers.map((layer, i) => ({ z: -0.3 + layer.z * 0.045, scale: 1 - i * (variant === "ember" ? 0.018 : 0.024), color: colors[Math.min(3, Math.floor(i * 4 / model.layers.length))] })), [model, colors, variant]);
  if (focused && variant !== "ember") return null;
  return <Float speed={reduced ? 0 : 1.1} floatIntensity={reduced ? 0 : 0.08} rotationIntensity={0}>
    <group ref={root} position={[x, focused ? 0.2 : index === 1 ? 0.16 : 0, 0]} rotation={view === "side" ? [-0.03, 1.38, 0] : [-0.04, (index - 1) * -0.08, 0]}>
      <RoundedBox args={[2.5, 3.5, 0.22]} radius={0.14} smoothness={5} position-z={-0.42}><meshStandardMaterial color="#201710" roughness={0.6} /></RoundedBox>
      {planes.map((plane, i) => <mesh key={i} position-z={plane.z} scale={[plane.scale, plane.scale, 1]}>
        <boxGeometry args={[1.75, 2.66, 0.075]} />
        <meshStandardMaterial color={plane.color} roughness={0.82} side={THREE.DoubleSide} />
      </mesh>)}
      <Frame z={variant === "ember" ? 0.53 : 0.36} color={colors[4]} />
      {variant === "astral" ? <AstralSubject /> : variant === "verdant" ? <VerdantSubject /> : <EmberSubject />}

      <group position={[0, -2.03, -0.3]}>
        <mesh rotation-x={-0.2}><boxGeometry args={[1.55, 0.12, 0.75]} /><meshPhysicalMaterial color="#b9d2d0" transparent opacity={0.42} roughness={0.18} transmission={0.35} /></mesh>
        <mesh position={[0, 0.34, -0.23]} rotation-x={-0.4}><boxGeometry args={[1.15, 0.75, 0.1]} /><meshPhysicalMaterial color="#a9c7c5" transparent opacity={0.36} transmission={0.45} /></mesh>
      </group>
    </group>
  </Float>;
}

export function PokemonCardStage({ reduced, view }: { reduced: boolean; view: "gallery" | "macro" | "side" }) {
  return <section data-testid="pokemon-card-webgl-stage" data-renderer="three-webgl" data-view={view} className="webgl-stage" aria-label="Three physically layered collector-card constructions">
    <div className="webgl-contracts" aria-hidden="true">
      {(["astral", "verdant", "ember"] as const).map((variant, index) => <span key={variant} data-webgl-card={variant} data-cavity-depth={premiumCardConstructions[index].cavityDepthMm} />)}
    </div>
    <Canvas orthographic dpr={1} camera={{ position: [0, 0.05, 10], zoom: 120, near: 0.08, far: 30 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#080d0d"]} />
      <fog attach="fog" args={["#080d0d", 9, 16]} />
      <ambientLight intensity={0.7} color="#9ec4bb" />
      <spotLight position={[-4, 6, 7]} intensity={90} angle={0.45} penumbra={0.8} color="#ffe0a1" castShadow />
      <pointLight position={[5, 1, 4]} intensity={38} color="#6dd7e5" />
      <pointLight position={[0, -3, 3]} intensity={24} color="#d26d31" />
      <ResponsiveCamera view={view} />
      <Card variant="astral" index={0} reduced={reduced} view={view} />
      <Card variant="verdant" index={1} reduced={reduced} view={view} />
      <Card variant="ember" index={2} reduced={reduced} view={view} />
    </Canvas>
  </section>;
}
