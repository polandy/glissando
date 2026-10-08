import { afterEach, describe, expect, it } from "vitest";
import { details, mountScreen, unmountScreen } from "./slideshow-screen-harness";

afterEach(() => unmountScreen());

function fact(term: string): string | undefined {
  const row = [...document.querySelectorAll(".rows > div")].find(
    (candidate) => candidate.querySelector("dt")?.textContent === term,
  );
  return row?.querySelector("dd")?.textContent?.trim();
}

describe("SlideshowScreen, captions", () => {
  it("counts the pictures with a caption among all of them", () => {
    mountScreen(details(["a", "b", "c"], { captionCount: 2 }));

    expect(fact("Bildtitel")).toBe("2 von 3");
  });

  it("counts none as 0 of all", () => {
    mountScreen(details(["a", "b"]));

    expect(fact("Bildtitel")).toBe("0 von 2");
  });
});
