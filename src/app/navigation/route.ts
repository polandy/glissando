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
   * pictures to that slideshow; with an album id, that album.
   */
  | {
      readonly screen: "immich";
      readonly albumId: string | null;
      readonly slideshowId: string | null;
    }
  | { readonly screen: "add"; readonly slideshowId: string }
  | { readonly screen: "player"; readonly slideshowId: string }
  | { readonly screen: "music"; readonly slideshowId: string }
  | { readonly screen: "picture"; readonly slideshowId: string; readonly pictureId: string };

export const START_ROUTE: Route = { screen: "start" };

/** The route one level up, or null for the start screen. */
export function parentOf(route: Route): Route | null {
  switch (route.screen) {
    case "start":
      return null;
    case "settings":
    case "slideshow":
      return START_ROUTE;
    case "import":
      return route.step === "music" ? { screen: "import", step: "pictures" } : START_ROUTE;
    case "immich":
      if (route.albumId !== null) {
        return { screen: "immich", albumId: null, slideshowId: route.slideshowId };
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

/**
 * Whether history may bring the route back: a selection of pictures lives in memory only, so
 * only its own screens bring each other back; the player's music needs a user gesture to start,
 * and a closed overlay stays closed.
 */
export function isRestorable(route: Route, from: Route | null): boolean {
  switch (route.screen) {
    case "player":
    case "settings":
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
    case "slideshow":
    case "player":
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
      const { albumId, slideshowId } = state;
      const isIdOrNull = (value: unknown): value is string | null => value === null || isId(value);
      return isIdOrNull(albumId) && isIdOrNull(slideshowId)
        ? { screen: "immich", albumId, slideshowId }
        : null;
    }
    default:
      return null;
  }
}
