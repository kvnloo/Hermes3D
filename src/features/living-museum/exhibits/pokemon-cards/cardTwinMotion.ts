export type CardTwinTilt = { rotateX: number; rotateY: number; x: number; y: number };

export function resolveCardTwinTilt(
  input: { x: number; y: number },
  depthMm: number,
  reducedMotion: boolean,
): CardTwinTilt {
  if (reducedMotion) return { rotateX: 0, rotateY: 0, x: 0, y: 0 };
  const x = Math.max(-1, Math.min(1, input.x));
  const y = Math.max(-1, Math.min(1, input.y));
  return {
    rotateX: Number((-y * 0.08).toFixed(3)),
    rotateY: Number((x * 0.12).toFixed(3)),
    x: Number((x * depthMm * 0.02).toFixed(3)),
    y: Number((y * depthMm * 0.015).toFixed(3)),
  };
}
