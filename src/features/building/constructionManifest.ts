import type { BuildStage } from "./buildContract";
export type ConstructionComponent = { id: string; kind: "annex-shell" | "annex-frame" | "annex-gallery" | "generic-scaffold"; stage: BuildStage; position: readonly [number, number, number]; size: readonly [number, number, number] };
export const LIVING_MUSEUM_CONSTRUCTION_MANIFEST = { version: 1, projectLabel: "Living Museum", components: [
  { id: "museum-annex-frame", kind: "annex-frame", stage: "FRAME", position: [17, 1.8, -8], size: [8, 3.6, 6] },
  { id: "museum-annex-shell", kind: "annex-shell", stage: "GEOMETRY", position: [17, 1.8, -8], size: [8, 3.6, 6] },
  { id: "museum-annex-gallery", kind: "annex-gallery", stage: "MATERIALS", position: [17, 1.2, -8], size: [6.8, 2.4, 4.8] },
] satisfies ConstructionComponent[] } as const;
const FALLBACK: ConstructionComponent = { id: "generic-scaffold", kind: "generic-scaffold", stage: "FRAME", position: [17, 1.5, -8], size: [4, 3, 4] };
export function resolveConstructionComponent(id: string): ConstructionComponent { return LIVING_MUSEUM_CONSTRUCTION_MANIFEST.components.find((component) => component.id === id) ?? FALLBACK; }
