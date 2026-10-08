/**
 * The app's places. Three levels, never more: start → slideshow → (import steps | player). The
 * player is a modal layer over its slideshow, yet it has a history entry so back closes it.
 */
export const IMPORT_STEPS = ["pictures", "music"] as const;
export type ImportStep = (typeof IMPORT_STEPS)[number];

export type Route =
  | { readonly screen: "start" }
  | { readonly screen: "slideshow"; readonly slideshowId: string }
  | { readonly screen: "import"; readonly step: ImportStep }
  | { readonly screen: "player"; readonly slideshowId: string };

export const START_ROUTE: Route = { screen: "start" };

/** The route one level up, or null for the start screen. */
export function parentOf(route: Route): Route | null {
  switch (route.screen) {
    case "start":
      return null;
    case "slideshow":
      return START_ROUTE;
    case "import":
      return route.step === "music" ? { screen: "import", step: "pictures" } : START_ROUTE;
    case "player":
      return { screen: "slideshow", slideshowId: route.slideshowId };
  }
}

/**
 * Whether history may bring the route back: an import's selection lives in memory only, and
 * the player's music needs a user gesture to start.
 */
export function isRestorable(route: Route, from: Route | null): boolean {
  switch (route.screen) {
    case "player":
      return false;
    case "import":
      return from?.screen === "import";
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
    case "slideshow":
    case "player": {
      const slideshowId = state["slideshowId"];
      return isId(slideshowId) ? { screen: state["screen"], slideshowId } : null;
    }
    case "import": {
      const step = IMPORT_STEPS.find((known) => known === state["step"]);
      return step ? { screen: "import", step } : null;
    }
    default:
      return null;
  }
}
