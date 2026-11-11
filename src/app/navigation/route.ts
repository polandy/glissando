/**
 * The app's places: start → (settings | import steps → Immich browser → album | slideshow →
 * (picture editor | music editor | player | add pictures → Immich browser → album)). The player
 * and the settings sheet are modal layers over their parent, yet each has a history entry so
 * back closes it.
 */
export const IMPORT_STEPS = ["pictures", "music"] as const;
export type ImportStep = (typeof IMPORT_STEPS)[number];

export type Route =
  | { readonly screen: "start" }
  | { readonly screen: "settings" }
  | { readonly screen: "slideshow"; readonly slideshowId: string }
  | { readonly screen: "import"; readonly step: ImportStep }
  /**
   * The Immich browser opened from the import's pictures step (slideshow id null) or from adding
   * pictures to that slideshow; with `opened`, that album or person.
   */
  | {
      readonly screen: "immich";
      readonly opened: OpenedSource | null;
      readonly slideshowId: string | null;
    }
  | { readonly screen: "add"; readonly slideshowId: string }
  /** With a picture, the player starts at the slide that plays it; without, at the start. */
  | { readonly screen: "player"; readonly slideshowId: string; readonly pictureId?: string }
  | { readonly screen: "music"; readonly slideshowId: string }
  | { readonly screen: "picture"; readonly slideshowId: string; readonly pictureId: string }
  | { readonly screen: "frameSetup" }
  /** The running picture frame (`dev-docs/app/FRAME.md`); over start, not over its set-up screen. */
  | { readonly screen: "frame"; readonly albumId: string };

/** What the Immich browser has open below its tabs: one album or one person. */
export interface OpenedSource {
  readonly kind: "album" | "person";
  readonly id: string;
}

const OPENED_KINDS: readonly OpenedSource["kind"][] = ["album", "person"];

export const START_ROUTE: Route = { screen: "start" };

/** The route one level up, or null for the start screen. */
export function parentOf(route: Route): Route | null {
  switch (route.screen) {
    case "start":
      return null;
    case "settings":
    case "slideshow":
    case "frameSetup":
    case "frame":
      return START_ROUTE;
    case "import":
      return route.step === "music" ? { screen: "import", step: "pictures" } : START_ROUTE;
    case "immich":
      if (route.opened !== null) {
        return { screen: "immich", opened: null, slideshowId: route.slideshowId };
      }
      return route.slideshowId === null
        ? { screen: "import", step: "pictures" }
        : { screen: "add", slideshowId: route.slideshowId };
    case "add":
    case "player":
    case "picture":
    case "music":
      return { screen: "slideshow", slideshowId: route.slideshowId };
  }
}

/** The screens whose selection of pictures lives in memory only. */
const SELECTING_SCREENS: ReadonlySet<Route["screen"]> = new Set(["import", "immich", "add"]);

/** The screens whose selection of pictures lives in memory; moving between them keeps it. */
export function isSelectingScreen(route: Route): boolean {
  return SELECTING_SCREENS.has(route.screen);
}

/**
 * Whether history may bring the route back: a selection of pictures lives in memory only, so
 * only its own screens bring each other back; the player's music needs a user gesture to start,
 * and a closed overlay stays closed.
 */
export function isRestorable(route: Route, from: Route | null): boolean {
  switch (route.screen) {
    case "player":
    case "settings":
    case "frame":
      return false;
    case "import":
    case "immich":
    case "add":
      return from !== null && SELECTING_SCREENS.has(from.screen);
    default:
      return true;
  }
}

export function sameRoute(a: Route, b: Route): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value !== "";
}

function parseOpened(value: unknown): OpenedSource | null {
  if (!isRecord(value)) return null;
  const kind = OPENED_KINDS.find((known) => known === value["kind"]);
  const id = value["id"];
  return kind !== undefined && isId(id) ? { kind, id } : null;
}

/** Reads a route back from untrusted history state; anything unknown is null. */
export function parseRoute(state: unknown): Route | null {
  if (!isRecord(state)) {
    return null;
  }
  switch (state["screen"]) {
    case "start":
      return START_ROUTE;
    case "settings":
      return { screen: "settings" };
    case "frameSetup":
      return { screen: "frameSetup" };
    case "frame": {
      const albumId = state["albumId"];
      return isId(albumId) ? { screen: "frame", albumId } : null;
    }
    case "player": {
      const { slideshowId, pictureId } = state;
      if (!isId(slideshowId)) return null;
      if (pictureId === undefined) return { screen: "player", slideshowId };
      return isId(pictureId) ? { screen: "player", slideshowId, pictureId } : null;
    }
    case "slideshow":
    case "music":
    case "add": {
      const slideshowId = state["slideshowId"];
      return isId(slideshowId) ? { screen: state["screen"], slideshowId } : null;
    }
    case "picture": {
      const { slideshowId, pictureId } = state;
      return isId(slideshowId) && isId(pictureId)
        ? { screen: "picture", slideshowId, pictureId }
        : null;
    }
    case "import": {
      const step = IMPORT_STEPS.find((known) => known === state["step"]);
      return step ? { screen: "import", step } : null;
    }
    case "immich": {
      const { opened, slideshowId } = state;
      if (slideshowId !== null && !isId(slideshowId)) return null;
      if (opened === null) return { screen: "immich", opened: null, slideshowId };
      const source = parseOpened(opened);
      return source === null ? null : { screen: "immich", opened: source, slideshowId };
    }
    default:
      return null;
  }
}

/** The route `levelsUp` parents above `route`; throws when the path is shorter. */
export function ancestorAt(route: Route, levelsUp: number): Route {
  let current: Route = route;
  for (let level = 0; level < levelsUp; level += 1) {
    const parent = parentOf(current);
    if (parent === null) {
      throw new Error(
        `${JSON.stringify(route)} has no ancestor ${levelsUp} levels up: the path ends after ${level}`,
      );
    }
    current = parent;
  }
  return current;
}
