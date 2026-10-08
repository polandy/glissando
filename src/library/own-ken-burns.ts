import { MIN_KEN_BURNS_ZOOM, type Framing } from "../player/slideshow";

/**
 * A picture's own Ken Burns motion, set in the picture editor: where it starts and ends, both in
 * the player's framing (zoom + centre in picture coordinates). Its easing is the automatic
 * motion's, so it is not stored. See ADR-0006.
 */
export interface OwnKenBurns {
  readonly from: Framing;
  readonly to: Framing;
}

/**
 * The largest zoom an own motion may reach: the pictures are stored at display resolution, so
 * further in they would turn visibly soft.
 */
export const MAX_OWN_KEN_BURNS_ZOOM = 3;

const MOTION_KEYS = ["from", "to"] as const;
const FRAMING_KEYS = ["zoom", "centerX", "centerY"] as const;

export class InvalidOwnKenBurnsError extends Error {
  constructor(
    where: string,
    /** The bad field within the motion, e.g. `from.zoom`; empty for the motion itself. */
    readonly path: string,
    readonly expected: string,
    readonly actual: unknown,
  ) {
    super(
      `${where} ${motionPath("kenBurns", path)}: expected ${expected}, got ${JSON.stringify(actual)}`,
    );
    this.name = "InvalidOwnKenBurnsError";
  }
}

/** `value` as an own motion; throws `InvalidOwnKenBurnsError` naming `where` and the bad field. */
export function checkOwnKenBurns(value: unknown, where: string): OwnKenBurns {
  const motion = readObject(value, where, "", MOTION_KEYS);
  return {
    from: readFraming(motion["from"], where, "from"),
    to: readFraming(motion["to"], where, "to"),
  };
}

function readFraming(value: unknown, where: string, path: string): Framing {
  const framing = readObject(value, where, path, FRAMING_KEYS);
  const zoom = framing["zoom"];
  if (typeof zoom !== "number" || !(zoom >= MIN_KEN_BURNS_ZOOM && zoom <= MAX_OWN_KEN_BURNS_ZOOM)) {
    throw new InvalidOwnKenBurnsError(
      where,
      `${path}.zoom`,
      `a number from ${MIN_KEN_BURNS_ZOOM} to ${MAX_OWN_KEN_BURNS_ZOOM}`,
      zoom,
    );
  }
  return {
    zoom,
    centerX: readUnit(framing["centerX"], where, `${path}.centerX`),
    centerY: readUnit(framing["centerY"], where, `${path}.centerY`),
  };
}

function readUnit(value: unknown, where: string, path: string): number {
  if (typeof value !== "number" || !(value >= 0 && value <= 1)) {
    throw new InvalidOwnKenBurnsError(where, path, "a number from 0 to 1", value);
  }
  return value;
}

/** Unknown keys are rejected, never ignored. */
function readObject(
  value: unknown,
  where: string,
  path: string,
  keys: readonly string[],
): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new InvalidOwnKenBurnsError(where, path, "an object", value);
  }
  const unknownKey = Object.keys(value).find((key) => !keys.includes(key));
  if (unknownKey !== undefined) {
    throw new InvalidOwnKenBurnsError(
      where,
      path === "" ? unknownKey : `${path}.${unknownKey}`,
      `one of ${keys.join(", ")}`,
      unknownKey,
    );
  }
  return value as Readonly<Record<string, unknown>>;
}

/** `field` within the motion at `base`, e.g. `kenBurns.from.zoom`. */
export function motionPath(base: string, field: string): string {
  return field === "" ? base : `${base}.${field}`;
}
