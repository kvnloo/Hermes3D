"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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

export function ConstructionSite({ state }: { state: BuildSceneState | null }) {
  const rootRef = useRef<THREE.Group>(null);
  const scanRef = useRef<THREE.Mesh>(null);
  const droneRef = useRef<THREE.Group>(null);
  const stageDepth = state ? STAGE_DEPTH[state.stage] : -1;
  const active = state !== null && state.status !== "ready";
  const frameVisible = active && stageDepth >= 1;
  const geometryVisible = active && stageDepth >= 2;
  const materialsVisible = active && stageDepth >= 3;
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
    if (rootRef.current) rootRef.current.visible = state !== null;
  });

  return (
    <group ref={rootRef} position={[17, 0.03, -8]} visible={state !== null}>
      <group visible={active}>
      <primitive object={grid} position={[0, 0.02, 0]} />
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
      <group visible={state?.finishedVisible === true}>
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[8, 3.6, 6]} />
          <meshStandardMaterial color="#173847" roughness={0.48} metalness={0.18} />
        </mesh>
        <mesh position={[0, 1.8, 3.04]}>
          <boxGeometry args={[6.8, 2.65, 0.08]} />
          <meshStandardMaterial color="#8edfec" roughness={0.18} metalness={0.06} />
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
      className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[calc(100%-2rem)] rounded border px-3 py-2 font-mono text-[11px] backdrop-blur-md sm:bottom-6 sm:left-6 sm:text-xs"
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
