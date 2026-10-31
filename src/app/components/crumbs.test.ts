import { describe, expect, it } from "vitest";
import type { Route } from "../navigation/route";
import { crumbTarget, type Crumb } from "./crumbs";

const WIZARD: Crumb = { label: "New slideshow", isScreen: false };
const START: Route = { screen: "start" };
const PICTURES: Route = { screen: "import", step: "pictures" };

describe("crumbTarget", () => {
  it("counts screen crumbs after the link, not labels", () => {
    const immich: Route = { screen: "immich", albumId: "a1", slideshowId: null };
    const crumbs = ["Library", WIZARD, "Pictures", "Immich", "Album"];

    expect(crumbTarget(crumbs, 0, immich)).toEqual(START);
    expect(crumbTarget(crumbs, 2, immich)).toEqual(PICTURES);
    expect(crumbTarget(crumbs, 3, immich)).toEqual({
      screen: "immich",
      albumId: null,
      slideshowId: null,
    });
  });

  it("takes the first crumb to the root of a path that has no crumb per screen", () => {
    const music: Route = { screen: "import", step: "music" };

    expect(crumbTarget(["Library", WIZARD, "Music"], 0, music)).toEqual(START);
  });

  it("reaches the slideshow from the add screen's Immich browser", () => {
    const immich: Route = { screen: "immich", albumId: null, slideshowId: "s1" };
    const crumbs = ["Library", "Sommer", "Add", "Immich"];

    expect(crumbTarget(crumbs, 1, immich)).toEqual({ screen: "slideshow", slideshowId: "s1" });
  });
});
