"use client";

import { Html } from "@react-three/drei";

import type { MuseumExhibitV1 } from "../../core/MuseumExhibitV1";
import { obsidianVaultManifest } from "./manifest";

export type ObsidianVaultLodTier = MuseumExhibitV1["lod"][number]["tier"];

const TIER_INDEX: Record<ObsidianVaultLodTier, number> = {
  hero: 0,
  near: 1,
  far: 2,
  sleep: 3,
};

export function selectObsidianVaultLod(
  distance: number,
  current: ObsidianVaultLodTier,
): ObsidianVaultLodTier {
  if (!Number.isFinite(distance) || distance < 0) return "sleep";

  let index = TIER_INDEX[current];
  const currentBand = obsidianVaultManifest.lod[index];
  if (index > 0 && distance <= currentBand.enterDistance) {
    while (index > 0 && distance <= obsidianVaultManifest.lod[index].enterDistance) index -= 1;
    return obsidianVaultManifest.lod[index].tier;
  }
  if (index < obsidianVaultManifest.lod.length - 1 && distance >= currentBand.exitDistance) {
    while (
      index < obsidianVaultManifest.lod.length - 1 &&
      distance >= obsidianVaultManifest.lod[index].exitDistance
    ) {
      index += 1;
    }
    return obsidianVaultManifest.lod[index].tier;
  }
  return current;
}

export type ObsidianVaultExhibitSceneProps = {
  active: boolean;
  distance: number;
  reducedMotion?: boolean;
  milestoneActive?: boolean;
  lodTier?: ObsidianVaultLodTier;
};

const OBSIDIAN = "#171a20";
const EDGE = "#59606b";
const PLINTH = "#30353d";

function SleepingMonument({ detailed }: { detailed: boolean }) {
  return (
    <group name="private-knowledge-vault-connector-disabled">
      <mesh position={[0, 2.65, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <octahedronGeometry args={[2.65, detailed ? 1 : 0]} />
        <meshStandardMaterial color={OBSIDIAN} roughness={0.24} metalness={0.62} flatShading />
      </mesh>
      {detailed ? (
        <>
          <mesh position={[0, 2.65, 0]} rotation={[0, Math.PI / 4, 0]}>
            <octahedronGeometry args={[2.78, 0]} />
            <meshBasicMaterial color={EDGE} wireframe transparent opacity={0.34} />
          </mesh>
          <mesh position={[0, 0.24, 0]} receiveShadow>
            <cylinderGeometry args={[4.2, 4.6, 0.48, 8]} />
            <meshStandardMaterial color={PLINTH} roughness={0.94} metalness={0.08} />
          </mesh>
          <mesh position={[0, 0.53, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[3.35, 0.055, 5, 8]} />
            <meshStandardMaterial color={EDGE} roughness={0.7} metalness={0.2} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

/** Static, zero-asset placeholder. It performs no connector or source I/O. */
export function ObsidianVaultExhibitScene({
  active,
  distance,
  lodTier,
}: ObsidianVaultExhibitSceneProps) {
  const tier = active ? (lodTier ?? selectObsidianVaultLod(distance, "near")) : "sleep";
  const detailed = tier === "hero" || tier === "near";

  return (
    <group name="obsidian-vault-disabled-placeholder">
      <SleepingMonument detailed={detailed} />
      {tier !== "sleep" ? (
        <Html position={[0, 6.35, 0]} center transform distanceFactor={9}>
          <div
            aria-label="Private Knowledge Vault - Connector Disabled"
            style={{
              width: "20rem",
              color: "#d7dbe0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.13em",
              lineHeight: 1.4,
              textAlign: "center",
              textTransform: "uppercase",
              textShadow: "0 1px 3px rgba(0, 0, 0, 0.9)",
              pointerEvents: "none",
            }}
          >
            PRIVATE KNOWLEDGE VAULT - CONNECTOR DISABLED
          </div>
        </Html>
      ) : null}
    </group>
  );
}
