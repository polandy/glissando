/** `#RRGGBB` to 0..1 RGB, for a `gl.uniform3f` (ADR-0032's ground and veil tint colours). */
export function hexToRgb01(hex: string): readonly [number, number, number] {
  const red = parseInt(hex.slice(1, 3), 16) / 255;
  const green = parseInt(hex.slice(3, 5), 16) / 255;
  const blue = parseInt(hex.slice(5, 7), 16) / 255;
  return [red, green, blue];
}
