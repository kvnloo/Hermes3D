export type CardTwinPartPlacement = {
  column: number;
  row: number;
  x: number;
  y: number;
};

export function resolvePartsSheetLayout(count: number, columns = 3): CardTwinPartPlacement[] {
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      column,
      row,
      x: (column - (columns - 1) / 2) * 2.5,
      y: -row * 1.7,
    };
  });
}
