import { afterEach, describe, expect, it } from "vitest";
import { lookFilterValues } from "../looks/look-filter";
import { GRADED_SLIDESHOW_LOOKS, type SlideshowLook } from "../looks/slideshow-look";
import { BLUE, RED, solidPicture, standingStill, viewportBox } from "../testing/browser-pictures";
import { DomRenderer } from "./dom-renderer";

const STILL = standingStill({ zoom: 1, centerX: 0.5, centerY: 0.5 });
/** A square picture covers this screen outright: a "cover" layout (ADR-0028). */
const COVER_VIEWPORT = { width: 160, height: 90 };
/** A square picture on this screen hides too much of itself covering: a "blurred fill". */
const BLURRED_FILL_VIEWPORT = { width: 1920, height: 1080 };
/** `dom-look-filters.ts`'s own id prefix, mirrored here as other DOM tests mirror its data attributes. */
const FILTER_ID_PREFIX = "glissando-look";

let box: HTMLElement;
afterEach(() => box.remove());

async function setUp(viewport = COVER_VIEWPORT) {
  box = viewportBox(viewport);
  return { renderer: new DomRenderer(box, () => undefined), picture: await solidPicture(RED) };
}

/** The look's own `<filter>`, built once per renderer by `DomLookFilters`. */
function filterElementFor(look: SlideshowLook): Element | null {
  return box.querySelector(`filter[id^="${FILTER_ID_PREFIX}-${look}-"]`);
}

/**
 * Whether `filter` carries `look`'s own `<filter>` reference. A browser's `style.filter` getter
 * may re-quote the id inside `url(...)` (WebKit always does, Chromium and Firefox too once set
 * through `Object.assign`), so this checks the id's presence rather than the whole string.
 */
function hasLookFilter(filter: string, look: SlideshowLook): boolean {
  const id = filterElementFor(look)?.id;
  return id !== undefined && filter.includes(`#${id}`);
}

describe("DomRenderer looks (ADR-0044)", () => {
  it.each(GRADED_SLIDESHOW_LOOKS)(
    "builds '%s' into a filter matching gradeColour's table",
    async (look) => {
      const { renderer, picture } = await setUp();
      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: { kind: "picture", picture, motion: STILL, fit: "cover" },
      });

      const element = filterElementFor(look);
      const expected = lookFilterValues(look);
      expect(element?.querySelector("feColorMatrix")?.getAttribute("values")).toBe(
        expected?.colorMatrixValues,
      );
      expect(element?.querySelector("feFuncR")?.getAttribute("tableValues")).toBe(
        expected?.tableValues.r,
      );
      expect(element?.querySelector("feFuncG")?.getAttribute("tableValues")).toBe(
        expected?.tableValues.g,
      );
      expect(element?.querySelector("feFuncB")?.getAttribute("tableValues")).toBe(
        expected?.tableValues.b,
      );
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)("applies '%s' to a cover layout's one picture", async (look) => {
    const { renderer, picture } = await setUp();
    renderer.render({
      kind: "slide",
      endFade: 0,
      look,
      slide: { kind: "picture", picture, motion: STILL, fit: "cover" },
    });

    expect(hasLookFilter(picture.element.style.filter, look)).toBe(true);
  });

  it("leaves a picture's filter empty for 'none'", async () => {
    const { renderer, picture } = await setUp();
    renderer.render({
      kind: "slide",
      endFade: 0,
      look: "none",
      slide: { kind: "picture", picture, motion: STILL, fit: "cover" },
    });

    expect(picture.element.style.filter).toBe("");
  });

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "applies '%s' to both of a pair's pictures, not to their shared host",
    async (look) => {
      const { renderer, picture } = await setUp();
      const partner = await solidPicture(BLUE);

      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: {
          kind: "picture",
          picture,
          motion: STILL,
          partner: { picture: partner, motion: STILL },
        },
      });

      expect(hasLookFilter(picture.element.style.filter, look)).toBe(true);
      expect(hasLookFilter(partner.element.style.filter, look)).toBe(true);
      expect(picture.element.parentElement?.style.filter).toBe("");
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "applies '%s' to a blurred fill's front and, after its own blur and darken, its backdrop",
    async (look) => {
      const { renderer, picture } = await setUp(BLURRED_FILL_VIEWPORT);

      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: { kind: "picture", picture, motion: STILL },
      });

      expect(hasLookFilter(picture.element.style.filter, look)).toBe(true);
      const group = picture.element.parentElement?.parentElement;
      expect(group?.style.filter).toBe("");
      const backdrop = group?.querySelector<HTMLElement>("img[data-backdrop]");
      const backdropFilter = backdrop?.style.filter ?? "";
      const id = filterElementFor(look)?.id ?? "";
      expect(hasLookFilter(backdropFilter, look)).toBe(true);
      expect(backdropFilter.indexOf("blur(")).toBeLessThan(backdropFilter.indexOf(`#${id}`));
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "combines '%s' with a cover layout's veil on their one shared node, look first",
    async (look) => {
      const { renderer, picture } = await setUp();

      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: {
          kind: "picture",
          picture,
          motion: STILL,
          fit: "cover",
          card: {
            card: {
              title: "Summer at the Lake",
              style: "modern",
              position: "centre",
              ink: "light",
              entrance: "rise",
              veil: { amount: 0.5, tint: "#2A2340" },
            },
            textOpacity: 1,
            driftEm: 0,
            veilAmount: 0.5,
            slideTimeMs: 800,
            reducedMotion: false,
          },
        },
      });

      const filter = picture.element.style.filter;
      const id = filterElementFor(look)?.id ?? "";
      expect(hasLookFilter(filter, look)).toBe(true);
      expect(filter).toContain("saturate(");
      expect(filter.indexOf(`#${id}`)).toBeLessThan(filter.indexOf("saturate("));
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "never grades a ground card's colour, under '%s'",
    async (look) => {
      const { renderer } = await setUp();

      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: {
          kind: "ground",
          ground: "#112233",
          card: {
            card: {
              title: "Summer at the Lake",
              style: "modern",
              position: "centre",
              ink: "light",
              entrance: "rise",
            },
            textOpacity: 1,
            driftEm: 0,
            veilAmount: 0,
            slideTimeMs: 800,
            reducedMotion: false,
          },
        },
      });

      const ground = box.querySelector<HTMLElement>("[data-ground]");
      expect(ground?.style.filter ?? "").toBe("");
    },
  );

  it.each(GRADED_SLIDESHOW_LOOKS)(
    "leaves a caption's own filter empty, under '%s'",
    async (look) => {
      const { renderer, picture } = await setUp();

      renderer.render({
        kind: "slide",
        endFade: 0,
        look,
        slide: { kind: "picture", picture, motion: STILL, fit: "cover", caption: "Lake" },
      });

      const caption = box.querySelector<HTMLElement>("[data-caption]");
      expect(caption?.textContent).toBe("Lake");
      expect(caption?.style.filter ?? "").toBe("");
    },
  );
});
