export type CardConstruction = {
  slug: string;
  rightsSafe: true;
  minimumLayers: number;
  maximumLayers: number;
  layers: readonly { name: string; z: number; band: string }[];
  layerSpacingMm: readonly [number, number];
  aspectRatio: number;
  totalThicknessMm: number;
  cavityDepthMm: number;
  bevelMm: number;
  silhouetteClearanceMm: number;
  innerFrameClearanceMm: number;
  foilFrame: { clearanceMm: number };
  stand: { contactPoints: number };
  materials: {
    foil: { metalness: number; roughness: number; channel: "iridescent-foil" };
    cardstock: { metalness: number; roughness: number; channel: "matte-cardstock" };
  };
  subjectDepthBands: readonly string[];
  projectedCardWidth: { desktop: number; mobile: number };
  camera: { near: number; subjectDistance: number; focusDistance: number };
};

const layers = (count: number, spacing: number, bands: readonly string[]) =>
  Array.from({ length: count }, (_, index) => ({
    name: `die-cut-${String(index + 1).padStart(2, "0")}`,
    z: Number((index * spacing).toFixed(2)),
    band: bands[Math.min(bands.length - 1, Math.floor(index * bands.length / count))],
  }));

const shared = {
  rightsSafe: true as const,
  aspectRatio: 63 / 88,
  bevelMm: 0.8,
  silhouetteClearanceMm: 2.2,
  innerFrameClearanceMm: 3.2,
  foilFrame: { clearanceMm: 2.4 },
  stand: { contactPoints: 2 },
  materials: {
    foil: { metalness: 0.88, roughness: 0.16, channel: "iridescent-foil" as const },
    cardstock: { metalness: 0.03, roughness: 0.82, channel: "matte-cardstock" as const },
  },
  projectedCardWidth: { desktop: 260, mobile: 112 },
  camera: { near: 0.08, subjectDistance: 4.2, focusDistance: 4.2 },
};

export const premiumCardConstructions: readonly CardConstruction[] = [
  { ...shared, slug: "astral-archive", minimumLayers: 6, maximumLayers: 10, layers: layers(8, 1.1, ["vault", "architecture", "astral-subject"]), layerSpacingMm: [0.6, 1.5], totalThicknessMm: 14, cavityDepthMm: 7.7, subjectDepthBands: ["architecture", "astral-subject"] },
  { ...shared, slug: "verdant-reliquary", minimumLayers: 6, maximumLayers: 10, layers: layers(9, 1.2, ["deep-forest", "mid-forest", "canopy"]), layerSpacingMm: [0.6, 1.5], totalThicknessMm: 17, cavityDepthMm: 9.6, subjectDepthBands: ["mid-forest", "canopy"] },
  { ...shared, slug: "emberwing-sanctuary", minimumLayers: 10, maximumLayers: 16, layers: layers(14, 1.8, ["forest-deep", "forest-mid", "ember-body", "ember-wings"]), layerSpacingMm: [1.5, 2.1], totalThicknessMm: 29, cavityDepthMm: 23.4, subjectDepthBands: ["forest-mid", "ember-body", "ember-wings"] },
] as const;
