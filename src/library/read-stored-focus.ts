import {
  DocumentFormatError,
  readObject,
  readPositiveInteger,
} from "../glissando-file/document-values";
import {
  SUBJECT_FINDERS,
  type FocusBox,
  type PictureFocus,
  type StoredFocus,
  type SubjectFinder,
} from "./picture-focus";

const STORED_FOCUS_KEYS = ["focus", "detector"] as const;
const FOCUS_KEYS = ["kind", "box", "foundBy"] as const;
const BOX_KEYS = ["x", "y", "width", "height"] as const;
const FOCUS_KINDS = ["subject", "scenery", "none"] as const;

/**
 * Untrusted JSON as a `StoredFocus`; throws `DocumentFormatError` naming the path and the bad
 * value, the same reader the server document and the manifest use (ADR-0041), so the server and
 * the app refuse a damaged or foreign result the same way.
 */
export function readStoredFocus(value: unknown, path: string): StoredFocus {
  const stored = readObject(value, path, STORED_FOCUS_KEYS);
  return {
    focus: readPictureFocus(stored["focus"], `${path}.focus`),
    detector: readPositiveInteger(stored["detector"], `${path}.detector`),
  };
}

function readPictureFocus(value: unknown, path: string): PictureFocus {
  const focus = readObject(value, path, FOCUS_KEYS);
  const { kind, box, foundBy } = focus;
  if (kind === "scenery" || kind === "none") {
    if (box !== undefined || foundBy !== undefined) {
      throw new DocumentFormatError(path, `only "kind" for ${kind}`, focus);
    }
    return { kind };
  }
  if (kind !== "subject") {
    throw new DocumentFormatError(`${path}.kind`, `one of ${FOCUS_KINDS.join(", ")}`, kind);
  }
  return {
    kind: "subject",
    box: readFocusBox(box, `${path}.box`),
    foundBy: readSubjectFinder(foundBy, `${path}.foundBy`),
  };
}

function readFocusBox(value: unknown, path: string): FocusBox {
  const box = readObject(value, path, BOX_KEYS);
  const x = readFraction(box["x"], `${path}.x`);
  const y = readFraction(box["y"], `${path}.y`);
  const width = readBoxSize(box["width"], `${path}.width`);
  const height = readBoxSize(box["height"], `${path}.height`);
  if (x + width > 1) {
    throw new DocumentFormatError(`${path}.width`, `at most ${1 - x} (1 - x)`, width);
  }
  if (y + height > 1) {
    throw new DocumentFormatError(`${path}.height`, `at most ${1 - y} (1 - y)`, height);
  }
  return { x, y, width, height };
}

/** A box's `x` or `y`: anywhere in the picture, including its far edge. */
function readFraction(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new DocumentFormatError(path, "a number from 0 to 1", value);
  }
  return value;
}

/** A box's `width` or `height`: some of the picture, never none of it. */
function readBoxSize(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1) {
    throw new DocumentFormatError(path, "a number greater than 0, up to 1", value);
  }
  return value;
}

function readSubjectFinder(value: unknown, path: string): SubjectFinder {
  if (typeof value !== "string" || !SUBJECT_FINDERS.includes(value as SubjectFinder)) {
    throw new DocumentFormatError(path, `one of ${SUBJECT_FINDERS.join(", ")}`, value);
  }
  return value as SubjectFinder;
}
