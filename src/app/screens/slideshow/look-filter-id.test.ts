import { describe, expect, it } from "vitest";
import { isGradedLook, SLIDESHOW_LOOKS } from "../../../player";
import { lookFilterId, lookFilterUrl } from "./look-filter-id";

describe("lookFilterId", () => {
  it.for(SLIDESHOW_LOOKS.filter(isGradedLook))(
    "gives a graded look (%s) a stable, prefix-scoped id",
    (look) => {
      expect(lookFilterId("strip", look)).toBe(`look-filter-strip-${look}`);
      expect(lookFilterId("strip", look)).toBe(lookFilterId("strip", look));
    },
  );

  it("gives none no id and no filter", () => {
    expect(lookFilterId("strip", "none")).toBeNull();
    expect(lookFilterUrl("strip", "none")).toBe("");
  });

  it.for(SLIDESHOW_LOOKS.filter(isGradedLook))(
    "builds a url() referencing the look's id (%s)",
    (look) => {
      expect(lookFilterUrl("strip", look)).toBe(`url(#${lookFilterId("strip", look)})`);
    },
  );

  it("never collides between two different prefixes for the same look", () => {
    for (const look of SLIDESHOW_LOOKS.filter(isGradedLook)) {
      expect(lookFilterId("strip", look)).not.toBe(lookFilterId("sheet", look));
    }
  });
});
