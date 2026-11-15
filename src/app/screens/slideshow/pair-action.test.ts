import { describe, expect, it } from "vitest";
import { pictureTile } from "../../testing/picture-fixtures";
import type { PictureTile } from "../view-models";
import { pairAction } from "./pair-action";
import { NO_SELECTION, soleSelection } from "./strip-selection";

const tile = (id: string, overrides: Partial<PictureTile> = {}) => pictureTile(id, "", overrides);
const split: string[] = [];
const rejoined: string[] = [];
const onSplit = (id: string) => split.push(id);
const onRejoin = (id: string) => rejoined.push(id);

describe("pairAction (ADR-0028)", () => {
  it("offers Split for a selected picture that shares a slide, splitting that pair", () => {
    const pictures = [tile("a", { pairedWithNumber: 2 }), tile("b", { pairedWithNumber: 1 })];

    const action = pairAction(pictures, soleSelection("b"), onSplit, onRejoin);
    action?.run();

    expect(action?.kind).toBe("split");
    expect(split.at(-1)).toBe("b");
  });

  it("offers Pair again for an alone picture that would pair without its mark", () => {
    const pictures = [tile("a"), tile("b", { rejoinsWithNumber: 1 })];

    const action = pairAction(pictures, soleSelection("b"), onSplit, onRejoin);
    action?.run();

    expect(action?.kind).toBe("rejoin");
    expect(rejoined.at(-1)).toBe("b");
  });

  it("offers nothing for a single picture, nor with no picture selected", () => {
    const pictures = [tile("a")];

    expect(pairAction(pictures, soleSelection("a"), onSplit, onRejoin)).toBeUndefined();
    expect(pairAction(pictures, NO_SELECTION, onSplit, onRejoin)).toBeUndefined();
  });

  it("offers nothing while selecting several", () => {
    const pictures = [tile("a", { pairedWithNumber: 2 })];
    const several = { ...soleSelection("a"), several: true };

    expect(pairAction(pictures, several, onSplit, onRejoin)).toBeUndefined();
  });
});
