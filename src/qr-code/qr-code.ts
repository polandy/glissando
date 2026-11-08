import { encode } from "uqr";

/**
 * Medium error correction: still read from a TV-lit phone screen or a smudged print, while a
 * link of about 50 characters stays at a coarse version.
 */
const ERROR_CORRECTION = "M";
/** The light margin scanners need around the code, in modules. */
const QUIET_ZONE_MODULES = 2;

/** A QR code as an SVG path of its dark modules on a `size` × `size` grid. */
export interface QrCode {
  readonly size: number;
  readonly path: string;
}

export function qrCodeOf(text: string): QrCode {
  const { size, data } = encode(text, { ecc: ERROR_CORRECTION, border: QUIET_ZONE_MODULES });
  return { size, path: modulesPath(data) };
}

/** Rows of modules, `true` for dark. */
export function modulesPath(rows: readonly (readonly boolean[])[]): string {
  return rows
    .flatMap((row, y) => row.map((dark, x) => (dark ? `M${String(x)} ${String(y)}h1v1h-1z` : "")))
    .join("");
}
