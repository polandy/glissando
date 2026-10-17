import { REDUCED_MOTION_QUERY } from "../../../ui-kit/reduced-motion";

export const TILE_GLIDE_MS = 550;

/** The strip's picture tiles (the list items) by picture id. */
function tilesById(strip: HTMLElement): Map<string, HTMLElement> {
  const tiles = new Map<string, HTMLElement>();
  for (const pick of strip.querySelectorAll<HTMLElement>(".pick[data-picture-id]")) {
    const tile = pick.closest<HTMLElement>("li");
    if (tile !== null) {
      tiles.set(pick.dataset.pictureId as string, tile);
    }
  }
  return tiles;
}

/** Where each picture's tile is now, to glide from once the order changed. */
export function tilePositions(strip: HTMLElement): Map<string, DOMRect> {
  return new Map([...tilesById(strip)].map(([id, tile]) => [id, tile.getBoundingClientRect()]));
}

/** Glides every tile from its place in `before` to its place now; with reduced motion they jump. */
export function glideTiles(strip: HTMLElement, before: ReadonlyMap<string, DOMRect>): void {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
    return;
  }
  for (const [id, tile] of tilesById(strip)) {
    const from = before.get(id);
    if (from === undefined) {
      continue;
    }
    const to = tile.getBoundingClientRect();
    tile.animate(
      [
        { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)` },
        { transform: "none" },
      ],
      { duration: TILE_GLIDE_MS, easing: "cubic-bezier(0.3, 0.7, 0.2, 1)" },
    );
  }
}
