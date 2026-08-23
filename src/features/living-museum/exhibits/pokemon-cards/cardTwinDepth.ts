import type { CardTwinLayer } from "./cardTwinCatalog";

export const CARD_TWIN_MIN_PLANE_SEPARATION = 0.028;
const CARD_TWIN_PLANE_STEP = 0.032;
const CARD_SHELL_FRONT_DEPTH = 0.012;
const LAYER_DEPTH_SCALE = 0.062;

export function resolveCardTwinSurfaceDepths(layers: readonly CardTwinLayer[]): Record<string, number> {
  const hiddenFill = CARD_SHELL_FRONT_DEPTH + CARD_TWIN_PLANE_STEP;
  let previousDepth = hiddenFill;
  const layerDepths: Record<string, number> = {};

  for (const layer of layers) {
    const physicalDepth = hiddenFill + CARD_TWIN_PLANE_STEP + layer.depthMm * LAYER_DEPTH_SCALE;
    const depth = Math.max(physicalDepth, previousDepth + CARD_TWIN_PLANE_STEP);
    layerDepths[layer.id] = depth;
    previousDepth = depth;
  }

  return {
    shellFront: CARD_SHELL_FRONT_DEPTH,
    hiddenFill,
    ...layerDepths,
    foil: previousDepth + CARD_TWIN_PLANE_STEP,
  };
}
