export type CardTwinTilt = { rotateX: number; rotateY: number; x: number; y: number };
export type CardTwinMotionVector = { x: number; y: number };
export type CardTwinOrientation = { beta: number; gamma: number };
export type CardTwinMotionCapability = "unavailable" | "denied" | "orientation";

export function getCardTwinMotionCapability(
  orientationAvailable: boolean,
  permissionRequired: boolean,
  permission: "unknown" | "granted" | "denied",
): CardTwinMotionCapability {
  if (!orientationAvailable) return "unavailable";
  if (permissionRequired && permission === "denied") return "denied";
  return "orientation";
}

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

export function normalizeCardTwinOrientation(
  current: CardTwinOrientation,
  neutral: CardTwinOrientation,
  screenAngle: number,
): CardTwinMotionVector {
  const portrait = {
    x: clampUnit((current.gamma - neutral.gamma) / 22),
    y: clampUnit((current.beta - neutral.beta) / 28),
  };
  const angle = ((screenAngle % 360) + 360) % 360;
  if (angle === 90) return { x: portrait.y, y: -portrait.x };
  if (angle === 270) return { x: -portrait.y, y: portrait.x };
  if (angle === 180) return { x: -portrait.x, y: -portrait.y };
  return portrait;
}

export function applyCardTwinMotionFilter(
  current: CardTwinMotionVector,
  target: CardTwinMotionVector,
  amount: number,
): CardTwinMotionVector {
  const alpha = Math.max(0, Math.min(1, amount));
  return {
    x: Number(clampUnit(current.x + (clampUnit(target.x) - current.x) * alpha).toFixed(4)),
    y: Number(clampUnit(current.y + (clampUnit(target.y) - current.y) * alpha).toFixed(4)),
  };
}

export function resolveCardTwinTilt(
  input: { x: number; y: number },
  depthMm: number,
  reducedMotion: boolean,
): CardTwinTilt {
  if (reducedMotion) return { rotateX: 0, rotateY: 0, x: 0, y: 0 };
  const x = clampUnit(input.x);
  const y = clampUnit(input.y);
  return {
    rotateX: Number((-y * 0.08).toFixed(3)),
    rotateY: Number((x * 0.12).toFixed(3)),
    x: Number((x * depthMm * 0.02).toFixed(3)),
    y: Number((y * depthMm * 0.015).toFixed(3)),
  };
}
