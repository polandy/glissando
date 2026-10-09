import type { Size, TransitionEffect } from "../../../player";

/**
 * The player's transition effects (its WebGL shaders) as CSS on two stacked layers, for the
 * picture editor's small previews. Crossfade, push, wipe, circle and zoom follow the shaders'
 * geometry; dissolve reveals a coarse grid of cells where the player reveals 4-pixel cells.
 */

/** Every property is always set, so a layer drops what an earlier effect left on it. */
export interface LayerStyle {
  readonly opacity: string;
  readonly transform: string;
  readonly clipPath: string;
  readonly maskImage: string;
}

export interface TransitionStyles {
  /** The picture being left, below. */
  readonly from: LayerStyle;
  /** The next picture, on top. */
  readonly to: LayerStyle;
}

const PLAIN: LayerStyle = { opacity: "1", transform: "none", clipPath: "none", maskImage: "none" };

/** The shaders' soft edge at a moving reveal, as a share of the screen. */
const SOFT_EDGE = 0.04;
const DISSOLVE_COLUMNS = 16;
const DISSOLVE_ROWS = 9;
const PERCENT = 100;

// A mask uses only the alpha of its colours: opaque shows the layer, transparent hides it.
const SHOWN = "#000";
const HIDDEN = "transparent";

export function transitionStyles(
  effect: TransitionEffect,
  progress: number,
  viewport: Size,
): TransitionStyles {
  switch (effect) {
    case "crossfade":
      return { from: PLAIN, to: { ...PLAIN, opacity: String(progress) } };
    case "push-left":
      return {
        from: { ...PLAIN, transform: `translateX(${-progress * PERCENT}%)` },
        to: { ...PLAIN, transform: `translateX(${(1 - progress) * PERCENT}%)` },
      };
    case "wipe-right": {
      const edge = progress * (1 + SOFT_EDGE);
      return {
        from: PLAIN,
        to: {
          ...PLAIN,
          maskImage: `linear-gradient(to right, ${SHOWN} ${round((edge - SOFT_EDGE) * PERCENT)}%, ${HIDDEN} ${round(edge * PERCENT)}%)`,
        },
      };
    }
    case "circle-open": {
      const softPx = SOFT_EDGE * viewport.height;
      const cornerPx = Math.hypot(viewport.width / 2, viewport.height / 2);
      const radiusPx = progress * (cornerPx + softPx);
      return {
        from: PLAIN,
        to: {
          ...PLAIN,
          maskImage: `radial-gradient(circle at center, ${SHOWN} ${radiusPx - softPx}px, ${HIDDEN} ${radiusPx}px)`,
        },
      };
    }
    case "zoom-in":
      return {
        from: { ...PLAIN, transform: `scale(${1 + progress})` },
        to: { ...PLAIN, opacity: String(smoothstep(progress)) },
      };
    case "dissolve":
      return { from: PLAIN, to: { ...PLAIN, clipPath: dissolveClip(progress, viewport) } };
  }
}

function round(percent: number): number {
  return Math.round(percent * PERCENT) / PERCENT;
}

function smoothstep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

/** The shaders' per-cell pseudo-random value in 0..1 (the well-known sin-hash). */
function cellNoise(column: number, row: number): number {
  const value = Math.sin(column * 12.9898 + row * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function dissolveClip(progress: number, viewport: Size): string {
  const cellWidth = viewport.width / DISSOLVE_COLUMNS;
  const cellHeight = viewport.height / DISSOLVE_ROWS;
  const cells: string[] = [];
  for (let row = 0; row < DISSOLVE_ROWS; row += 1) {
    for (let column = 0; column < DISSOLVE_COLUMNS; column += 1) {
      if (cellNoise(column, row) < progress) {
        // A hair wider than the cell, so neighbouring cells leave no seam.
        cells.push(
          `M${column * cellWidth} ${row * cellHeight}h${cellWidth + 0.5}v${cellHeight + 0.5}h${-cellWidth - 0.5}Z`,
        );
      }
    }
  }
  // An empty path would clip nothing; an inset of the full width hides the layer.
  return cells.length === 0 ? "inset(0 100% 0 0)" : `path("${cells.join("")}")`;
}
