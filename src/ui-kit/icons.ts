/**
 * The app's line icons on a 24-unit grid; this table is their one source (see dev-docs/BRAND.md).
 * Icon.svelte draws them with a shared stroke, so a shape here carries geometry only.
 */
export type IconShape =
  | { readonly kind: "path"; readonly d: string }
  | { readonly kind: "circle"; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rx: number;
    };

export interface IconDefinition {
  readonly shapes: readonly IconShape[];
  /** Solid glyphs (play, pause) read better filled than outlined at small sizes. */
  readonly filled?: boolean;
}

const path = (d: string): IconShape => ({ kind: "path", d });
const circle = (cx: number, cy: number, r: number): IconShape => ({ kind: "circle", cx, cy, r });
const rect = (x: number, y: number, width: number, height: number, rx: number): IconShape => ({
  kind: "rect",
  x,
  y,
  width,
  height,
  rx,
});

export const ICONS = {
  back: { shapes: [path("M15 6l-6 6 6 6")] },
  chevronLeft: { shapes: [path("M15 6l-6 6 6 6")] },
  chevronRight: { shapes: [path("M9 6l6 6-6 6")] },
  plus: { shapes: [path("M12 5v14M5 12h14")] },
  minus: { shapes: [path("M5 12h14")] },
  play: { shapes: [path("M7 4.5v15l13-7.5z")], filled: true },
  pause: { shapes: [path("M7 5h3.5v14H7zM13.5 5H17v14h-3.5z")], filled: true },
  replay: { shapes: [path("M4.5 12a7.5 7.5 0 102.2-5.3L4.5 9"), path("M4.5 4.5V9H9")] },
  close: { shapes: [path("M6 6l12 12M18 6L6 18")] },
  image: { shapes: [rect(3, 4.5, 18, 15, 2.5), circle(9, 10, 1.8), path("M21 16l-5-5-9 8.5")] },
  music: { shapes: [path("M9 18V6l11-2v12"), circle(6.5, 18, 2.5), circle(17.5, 16, 2.5)] },
  volume: {
    shapes: [
      path("M4 9.5h3.5L12 6v12l-4.5-3.5H4z"),
      path("M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10"),
    ],
  },
  volumeOff: { shapes: [path("M4 9.5h3.5L12 6v12l-4.5-3.5H4z"), path("M16 10l4 4M20 10l-4 4")] },
  folder: {
    shapes: [
      path(
        "M3 7.5A1.5 1.5 0 014.5 6H9l2 2h8.5A1.5 1.5 0 0121 9.5v8a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5z",
      ),
    ],
  },
  download: { shapes: [path("M12 4v11M7 10.5l5 5 5-5M5 19.5h14")] },
  open: {
    shapes: [
      path(
        "M3 7.5A1.5 1.5 0 014.5 6H9l2 2h8.5A1.5 1.5 0 0121 9.5v8a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 17.5z",
      ),
      path("M12 11v5M9.5 13.5L12 11l2.5 2.5"),
    ],
  },
  clock: { shapes: [circle(12, 12, 8.5), path("M12 7.5V12l3 2")] },
  info: { shapes: [circle(12, 12, 9), path("M12 11v5M12 8h.01")] },
  alert: {
    shapes: [
      path("M10.3 4.3L2.6 18a2 2 0 001.7 3h15.4a2 2 0 001.7-3L13.7 4.3a2 2 0 00-3.4 0z"),
      path("M12 9.5v4M12 17h.01"),
    ],
  },
  pencil: { shapes: [path("M4 20h4L19 9l-4-4L4 16z")] },
  frame: { shapes: [rect(3, 6, 13, 9, 1), rect(8, 9, 13, 9, 1)] },
  transition: {
    shapes: [
      rect(3, 6, 10, 12, 1.5),
      path("M13 6h6.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H13"),
    ],
  },
  swap: { shapes: [path("M7 7h11l-3-3M17 17H6l3 3")] },
  trash: {
    shapes: [
      path(
        "M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a1.5 1.5 0 001.5 1.3h6.2a1.5 1.5 0 001.5-1.3L17.5 7M10 11v6M14 11v6",
      ),
    ],
  },
  grip: {
    shapes: [
      circle(9, 6, 1.3),
      circle(15, 6, 1.3),
      circle(9, 12, 1.3),
      circle(15, 12, 1.3),
      circle(9, 18, 1.3),
      circle(15, 18, 1.3),
    ],
  },
  more: { shapes: [circle(5, 12, 1.2), circle(12, 12, 1.2), circle(19, 12, 1.2)] },
  expand: { shapes: [path("M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5")] },
  install: { shapes: [path("M12 4v11M7 10l5 5 5-5M5 20h14")] },
  refresh: { shapes: [path("M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7")] },
  share: { shapes: [path("M12 3v12M8 7l4-4 4 4"), path("M6 11v9h12v-9")] },
  film: {
    shapes: [rect(3, 5, 18, 14, 2.5), path("M3 9h18M3 15h18M8 5v4M16 5v4M8 15v4M16 15v4")],
  },
  /** A browser window with code brackets: the web page export. */
  page: {
    shapes: [
      rect(3, 4, 18, 16, 2.5),
      path("M3 8.5h18M10 12.5l-2.2 2.2L10 17M14 12.5l2.2 2.2L14 17"),
    ],
  },
  /** Opens in a new tab. */
  newTab: {
    shapes: [
      path("M14 4h6v6M20 4l-9 9"),
      path("M18 14v4.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 014 18.5v-11A1.5 1.5 0 015.5 6H10"),
    ],
  },
  addToHome: { shapes: [rect(4, 4, 16, 16, 3), path("M12 8v8M8 12h8")] },
  menuDots: { shapes: [circle(12, 5, 1.2), circle(12, 12, 1.2), circle(12, 19, 1.2)] },
  check: { shapes: [path("M5 12.5l4.5 4.5L19 7.5")] },
  checkCircle: { shapes: [circle(12, 12, 8.5), path("M8.3 12.3l2.8 2.8L15.8 9")] },
  fadeIn: { shapes: [path("M2 18L12 7h10")] },
  fadeOut: { shapes: [path("M2 7h10l10 11")] },
  gear: {
    shapes: [
      circle(12, 12, 3),
      path(
        "M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
      ),
    ],
  },
  sun: {
    shapes: [
      circle(12, 12, 4),
      path(
        "M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4",
      ),
    ],
  },
  moon: { shapes: [path("M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z")] },
  monitor: { shapes: [rect(3, 4, 18, 12, 2), path("M8 20h8M12 16v4")] },
  search: { shapes: [circle(11, 11, 6.5), path("M16 16l4 4")] },
  cloudOff: {
    shapes: [
      path("M3 3l18 18"),
      path("M8 7.5A5.5 5.5 0 0117.5 10 4 4 0 0120 16.5M16 18H7a4.5 4.5 0 01-1.6-8.7"),
    ],
  },
  server: {
    shapes: [rect(4, 4, 16, 6, 1.5), rect(4, 14, 16, 6, 1.5), path("M8 7h.01M8 17h.01")],
  },
  device: { shapes: [rect(6, 3, 12, 18, 2), path("M11 18h2")] },
  upload: { shapes: [path("M12 20V9M7 14l5-5 5 5M5 4h14")] },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
