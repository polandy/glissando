import { describe, expect, it } from "vitest";
import { readManifest } from "./read-manifest";
import {
  BASE_MANIFEST,
  validateManifestSchema,
  withAt,
  withoutAt,
} from "./testing/manifest-schema-fixtures";

const openingCard = ["slideshow", "openingCard"] as const;
const closingBackground = ["slideshow", "closingCard", "background"] as const;

function expectBothRefuse(doc: unknown): void {
  expect(validateManifestSchema(doc)).toBe(false);
  expect(readManifest(JSON.stringify(doc)).kind).not.toBe("ok");
}

describe("CARD_SCHEMA and CARD_BACKGROUND_SCHEMA: broken cards", () => {
  it.each([
    ["missing title", withoutAt(BASE_MANIFEST, [...openingCard, "title"])],
    ["missing style", withoutAt(BASE_MANIFEST, [...openingCard, "style"])],
    ["missing position", withoutAt(BASE_MANIFEST, [...openingCard, "position"])],
    ["missing entrance", withoutAt(BASE_MANIFEST, [...openingCard, "entrance"])],
    ["missing background", withoutAt(BASE_MANIFEST, [...openingCard, "background"])],
    ["missing motion", withoutAt(BASE_MANIFEST, [...openingCard, "motion"])],
    ["an unknown key", withAt(BASE_MANIFEST, [...openingCard, "extra"], true)],
    ["style an outsider", withAt(BASE_MANIFEST, [...openingCard, "style"], "nonsense")],
    ["position an outsider", withAt(BASE_MANIFEST, [...openingCard, "position"], "nonsense")],
    ["entrance an outsider", withAt(BASE_MANIFEST, [...openingCard, "entrance"], "nonsense")],
    ["motion of the wrong type", withAt(BASE_MANIFEST, [...openingCard, "motion"], "yes")],
    ["title of the wrong type", withAt(BASE_MANIFEST, [...openingCard, "title"], 5)],
    ["background: missing kind", withoutAt(BASE_MANIFEST, [...openingCard, "background", "kind"])],
    [
      "background: kind an outsider",
      withAt(BASE_MANIFEST, [...openingCard, "background", "kind"], "nonsense"),
    ],
    [
      "background: an unknown key",
      withAt(BASE_MANIFEST, [...openingCard, "background", "extra"], true),
    ],
    [
      "background: kind colour but no colour",
      withoutAt(BASE_MANIFEST, [...openingCard, "background", "colour"]),
    ],
    [
      "background: colour not a swatch or a hex colour",
      withAt(BASE_MANIFEST, [...openingCard, "background", "colour"], "nonsense"),
    ],
    [
      "background: kind picture but no pictureIndex",
      withoutAt(BASE_MANIFEST, [...closingBackground, "pictureIndex"]),
    ],
    [
      "background: kind picture but no fade",
      withoutAt(BASE_MANIFEST, [...closingBackground, "fade"]),
    ],
    [
      "background: kind picture but no tint",
      withoutAt(BASE_MANIFEST, [...closingBackground, "tint"]),
    ],
    [
      "background: pictureIndex negative",
      withAt(BASE_MANIFEST, [...closingBackground, "pictureIndex"], -1),
    ],
    [
      "background: fade below its minimum",
      withAt(BASE_MANIFEST, [...closingBackground, "fade"], -5),
    ],
    [
      "background: fade above its maximum",
      withAt(BASE_MANIFEST, [...closingBackground, "fade"], 105),
    ],
    ["background: fade off the 5-step", withAt(BASE_MANIFEST, [...closingBackground, "fade"], 61)],
    [
      "background: tint an outsider",
      withAt(BASE_MANIFEST, [...closingBackground, "tint"], "nonsense"),
    ],
  ])("%s is refused by both the reader and the schema", (_name, doc) => {
    expectBothRefuse(doc);
  });
});

describe("CARD_SCHEMA: a card text's whitespace", () => {
  it.each([
    ["a leading space", " Summer"],
    ["a repeated space", "Summer  2026"],
    ["a line break", "Summer\n2026"],
  ])("%s is refused by both", (_name, text) => {
    expectBothRefuse(withAt(BASE_MANIFEST, [...openingCard, "title"], text));
  });

  it.each([
    ["empty", ""],
    ["words with single spaces", "Summer 2026"],
  ])("%s is accepted by both", (_name, text) => {
    const doc = withAt(BASE_MANIFEST, [...openingCard, "title"], text);
    expect(validateManifestSchema(doc)).toBe(true);
    expect(readManifest(JSON.stringify(doc)).kind).toBe("ok");
  });
});
