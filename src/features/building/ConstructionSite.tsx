"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { BuildSceneState, BuildStage } from "./buildContract";

const STAGE_DEPTH: Record<BuildStage, number> = {
  DISCOVER: 0,
  FRAME: 1,
  GEOMETRY: 2,
  MATERIALS: 3,
  LIGHTING: 4,
  INTEGRATE: 5,
  VERIFY: 6,
  READY: 7,
};
const BEAM_POSITIONS: readonly (readonly [number, number, number])[] = [
  [-3.8, 0, -2.8], [3.8, 0, -2.8], [-3.8, 0, 2.8], [3.8, 0, 2.8],
  [-3.8, 3.6, -2.8], [3.8, 3.6, -2.8], [-3.8, 3.6, 2.8], [3.8, 3.6, 2.8],
];
const PANEL_POSITIONS: readonly (readonly [number, number, number])[] = [
  [-2.6, 1.6, -2.9], [0, 1.6, -2.9], [2.6, 1.6, -2.9],
  [-2.6, 1.6, 2.9], [0, 1.6, 2.9], [2.6, 1.6, 2.9],
];

export function getConstructionPresentation(state: BuildSceneState | null) {
  const stageDepth = state ? STAGE_DEPTH[state.stage] : -1;
  const active = state !== null && state.status !== "ready";
  return {
    siteVisible: state !== null,
    active,
    discoveryVisible: active && stageDepth >= 0,
    frameVisible: active && stageDepth >= 1,
    geometryVisible: active && stageDepth >= 2,
    materialsVisible: active && stageDepth >= 3,
    landmarkVisible: active && stageDepth >= 0,
    finishedVisible: state?.finishedVisible === true,
  };
}

export function ConstructionSite({ state }: { state: BuildSceneState | null }) {
  const scanRef = useRef<THREE.Mesh>(null);
  const droneRef = useRef<THREE.Group>(null);
  const presentation = getConstructionPresentation(state);
  const { active, discoveryVisible, frameVisible, geometryVisible, materialsVisible } = presentation;
  const failed = state?.status === "failed" || state?.status === "stale";

  const grid = useMemo(() => new THREE.GridHelper(10, 20, 0x34d9ff, 0x276073), []);

  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    if (scanRef.current) scanRef.current.position.y = 0.08 + ((t * 0.55) % 3.5);
    if (droneRef.current) {
      droneRef.current.position.x = Math.sin(t * 0.65) * 3.2;
      droneRef.current.position.y = 3.8 + Math.sin(t * 1.7) * 0.2;
    }
  });

  return (
    <group position={[6.5, 0.03, -1.5]} visible={presentation.siteVisible}>
      <Html position={[0, 7.8, 0]} center distanceFactor={18} zIndexRange={[12, 0]}>
        <div className="pointer-events-none min-w-max rounded-md border border-amber-300/70 bg-black/85 px-3 py-2 text-center font-mono text-[11px] font-bold tracking-[0.16em] text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.35)]">
          <div>MUSEUM ANNEX</div>
          <div className="mt-1 text-[9px] text-cyan-200">{state?.stage} · {presentation.finishedVisible ? "HANDOFF COMPLETE" : "CONSTRUCTION ACTIVE"}</div>
        </div>
      </Html>
      <group visible={active}>
      <primitive object={grid} position={[0, 0.02, 0]} visible={discoveryVisible} />
      <mesh position={[0, 0.055, 0]} visible={discoveryVisible}>
        <boxGeometry args={[8.6, 0.08, 6.6]} />
        <meshBasicMaterial color="#123b48" transparent opacity={0.72} wireframe />
      </mesh>
      {/* High-contrast gate and crane: a literal construction silhouette from DISCOVER onward. */}
      <group visible={discoveryVisible}>
        {([-3.7, 3.7] as const).map((x) => (
          <mesh key={x} position={[x, 1.35, 3.25]}>
            <boxGeometry args={[0.18, 2.7, 0.18]} />
            <meshBasicMaterial color="#ffd34d" />
          </mesh>
        ))}
        <mesh position={[0, 2.65, 3.25]}>
          <boxGeometry args={[7.6, 0.22, 0.18]} />
          <meshBasicMaterial color="#ffd34d" />
        </mesh>
        <mesh position={[-3.5, 3.5, -2.5]}>
          <boxGeometry args={[0.2, 7, 0.2]} />
          <meshBasicMaterial color="#ffb52e" />
        </mesh>
        <mesh position={[-0.3, 6.85, -2.5]}>
          <boxGeometry args={[6.6, 0.18, 0.18]} />
          <meshBasicMaterial color="#ffb52e" />
        </mesh>
      </group>
      <mesh ref={scanRef} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.5, 0.05]} />
        <meshBasicMaterial color={failed ? "#ff405c" : "#63eeff"} transparent opacity={0.85} />
      </mesh>

      {BEAM_POSITIONS.map((position, index) => (
        <mesh key={index} position={position} visible={frameVisible}>
          <boxGeometry args={[0.14, position[1] > 0 ? 0.14 : 3.6, 0.14]} />
          <meshBasicMaterial color={failed ? "#ff405c" : "#48d8ff"} wireframe />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 0]} visible={geometryVisible}>
        <boxGeometry args={[8, 3.6, 6]} />
        <meshStandardMaterial
          color={failed ? "#8b1830" : materialsVisible ? "#244d62" : "#4adfff"}
          transparent
          opacity={materialsVisible ? 0.3 : 0.12}
          wireframe={!materialsVisible}
          roughness={0.72}
          metalness={0.08}
        />
      </mesh>
      {PANEL_POSITIONS.map((position, index) => (
        <mesh key={index} position={position} visible={materialsVisible}>
          <boxGeometry args={[2.35, 2.7, 0.08]} />
          <meshStandardMaterial color="#315d73" transparent opacity={0.58} roughness={0.75} />
        </mesh>
      ))}
      <group ref={droneRef} position={[0, 3.8, 0]} visible={active}>
        <mesh>
          <octahedronGeometry args={[0.25, 0]} />
          <meshBasicMaterial color={failed ? "#ff405c" : "#8df7ff"} wireframe />
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.3, 4]} />
          <meshBasicMaterial color={failed ? "#ff405c" : "#43ddff"} transparent opacity={0.45} />
        </mesh>
      </group>
      </group>
      <group visible={presentation.finishedVisible}>
        <mesh position={[0, 0.08, 0]}>
          <boxGeometry args={[8, 0.12, 6]} />
          <meshStandardMaterial color="#173847" roughness={0.48} metalness={0.18} />
        </mesh>
        {BEAM_POSITIONS.slice(0, 4).map((position, index) => (
          <mesh key={index} position={[position[0], 1.8, position[2]]}>
            <boxGeometry args={[0.18, 3.6, 0.18]} />
            <meshStandardMaterial color="#49bfd2" roughness={0.35} />
          </mesh>
        ))}
        <mesh position={[0, 1.8, -3.04]}>
          <boxGeometry args={[7.7, 3.25, 0.08]} />
          <meshStandardMaterial color="#8edfec" transparent opacity={0.42} roughness={0.18} />
        </mesh>
        <mesh position={[0, 3.64, 0]}>
          <boxGeometry args={[8.4, 0.12, 6.4]} />
          <meshStandardMaterial color="#49bfd2" roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}

export function BuildProvenance({ state }: { state: BuildSceneState | null }) {
  if (!state) return null;
  const problem = state.status === "failed" || state.status === "stale";
  const compilerComplete = state.type === "build.progress";
  return (
    <aside
      data-testid="build-provenance"
      className="pointer-events-none absolute left-2 top-14 z-20 max-w-[calc(100%-4rem)] rounded border px-2 py-1.5 font-mono text-[9px] backdrop-blur-md sm:bottom-6 sm:left-6 sm:top-auto sm:max-w-[calc(100%-2rem)] sm:px-3 sm:py-2 sm:text-xs"
      style={{
        borderColor: problem ? "rgba(255,64,92,.7)" : "rgba(80,224,255,.6)",
        background: "rgba(4,15,22,.78)",
        color: problem ? "#ff8798" : "#baf7ff",
      }}
      aria-live="polite"
    >
      <div className="font-semibold tracking-[0.18em]">
        {problem
          ? state.status.toUpperCase()
          : state.status === "ready"
            ? "BUILD VERIFIED"
            : compilerComplete
              ? "BUILD COMPLETE · VERIFYING / PRESENTING"
              : "BUILDING IN PROGRESS"}
      </div>
      <div>{state.assetLabel} · {state.stage} · {state.progress === null ? "INDETERMINATE" : `${Math.round(state.progress)}%`}</div>
      <div className="opacity-70">rev {state.revision} · {state.agentCount} agent{state.agentCount === 1 ? "" : "s"}</div>
    </aside>
  );
}
