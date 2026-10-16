import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { PictureMeasure } from "../../culling/picture-checker";
import { FakePictureChecker } from "../../culling/testing/fake-picture-checker";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";
import PictureIntakeBody from "./PictureIntakeBody.svelte";

const NO_SOURCES = createRawSnippet(() => ({ render: () => "<div></div>" }));
const SCENE = 0x0f0f_0f0f_0f0f_0f0fn;
const measure = (sharpness: number, hash = SCENE): PictureMeasure => ({ sharpness, hash });

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountBody(checker?: FakePictureChecker) {
  const loaded: string[] = [];
  const { ports, toaster } = fakeIntakePorts(undefined, checker === undefined ? {} : { checker });
  const intake = new PictureIntake(ports);
  const body = mountWithTranslator(PictureIntakeBody, {
    intake,
    loadThumbnail: () => Promise.resolve(new Blob()),
    loadPicture: (pictureId: string) => {
      loaded.push(pictureId);
      return Promise.resolve(new Blob());
    },
    onError: () => undefined,
    onFiles: () => undefined,
    onDiscard: () => undefined,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    sources: NO_SOURCES,
  });
  unmounts.push(body.destroy);
  return { intake, toaster, loaded, target: body.target };
}

async function mountWithPictures(...names: string[]) {
  const body = mountBody();
  body.intake.addPictures(
    names.map((name, day) => pictureFile(name, `2025-07-0${day + 1}T10:00:00Z`)),
  );
  await body.intake.settled();
  flushSync();
  return body;
}

const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const viewButtons = (target: HTMLElement) => [
  ...target.querySelectorAll<HTMLButtonElement>(".strip button.view"),
];
const viewer = (target: HTMLElement) => target.querySelector<HTMLElement>("[role=dialog]");
const press = (key: string) => {
  document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  flushSync();
};
const click = (target: HTMLElement, selector: string) => {
  target.querySelector<HTMLElement>(selector)?.click();
  flushSync();
};

describe("PictureIntakeBody, a picture full screen", () => {
  it("names a tile's view button by the picture's date and time", async () => {
    const { target } = await mountWithPictures("beach.jpg", "hill.jpg");

    expect(viewButtons(target).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Bild vom 01.07.2025 um 10:00:00 ansehen",
      "Bild vom 02.07.2025 um 10:00:00 ansehen",
    ]);
  });

  it("opens the chosen picture as a modal dialog with its date and place, loading the full pictures", async () => {
    const { target, loaded } = await mountWithPictures("beach.jpg", "hill.jpg");

    viewButtons(target)[1]?.click();
    flushSync();

    const dialog = viewer(target);
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    expect(dialog?.getAttribute("aria-label")).toBe("Bild vom 02.07.2025");
    expect(text(dialog?.querySelector(".meta"))).toBe("02.07.2025 · 10:00:00 2 von 2");
    expect(loaded).toHaveLength(2);
  });

  it("browses with the arrow keys and stops at the ends", async () => {
    const { target } = await mountWithPictures("beach.jpg", "hill.jpg");
    viewButtons(target)[0]?.click();
    flushSync();

    press("ArrowLeft");
    expect(text(viewer(target)?.querySelector(".meta span"))).toBe("1 von 2");
    press("ArrowRight");
    expect(text(viewer(target)?.querySelector(".meta span"))).toBe("2 von 2");
    press("ArrowRight");
    expect(text(viewer(target)?.querySelector(".meta span"))).toBe("2 von 2");
  });

  it("jumps to a picture with its filmstrip thumbnail", async () => {
    const { target } = await mountWithPictures("beach.jpg", "hill.jpg", "lake.jpg");
    viewButtons(target)[0]?.click();
    flushSync();

    target.querySelectorAll<HTMLElement>(".film button")[2]?.click();
    flushSync();

    expect(text(viewer(target)?.querySelector(".meta span"))).toBe("3 von 3");
    expect(target.querySelectorAll(".film button")[2]?.getAttribute("aria-current")).toBe("true");
  });

  it("closes with Escape and focuses the tile it came from", async () => {
    const { target } = await mountWithPictures("beach.jpg", "hill.jpg");
    const opener = viewButtons(target)[1];
    opener?.focus();
    opener?.click();
    flushSync();
    expect(viewer(target)).not.toBeNull();

    press("Escape");

    expect(viewer(target)).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("removes the shown picture, with the undo toast, and shows the next one", async () => {
    const { intake, toaster, target } = await mountWithPictures(
      "beach.jpg",
      "hill.jpg",
      "lake.jpg",
    );
    viewButtons(target)[1]?.click();
    flushSync();

    click(target, ".pill.remove");

    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toEqual([
      "beach.jpg",
      "lake.jpg",
    ]);
    expect(toaster.current?.text).toBe("1 picture removed");
    expect(text(viewer(target)?.querySelector(".meta span"))).toBe("2 von 2");
    expect(text(viewer(target)?.querySelector(".meta b"))).toBe("03.07.2025 · 10:00:00");
  });

  it("removes with the Delete key", async () => {
    const { intake, target } = await mountWithPictures("beach.jpg", "hill.jpg");
    viewButtons(target)[0]?.click();
    flushSync();

    press("Delete");

    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toEqual(["hill.jpg"]);
  });

  it("closes once the last picture is removed", async () => {
    const { target } = await mountWithPictures("beach.jpg");
    viewButtons(target)[0]?.click();
    flushSync();

    click(target, ".pill.remove");

    expect(viewer(target)).toBeNull();
  });
});

describe("PictureIntakeBody, a set-aside picture full screen", () => {
  async function mountWithSetAside() {
    const checker = new FakePictureChecker({
      "thumbnail a.jpg": measure(240),
      "thumbnail b.jpg": measure(455),
      "thumbnail x.jpg": measure(900, 2n),
    });
    const body = mountBody(checker);
    body.intake.addPictures([
      pictureFile("a.jpg", "2025-07-02T14:02:10Z"),
      pictureFile("b.jpg", "2025-07-02T14:02:11Z"),
      pictureFile("x.jpg", "2025-07-03T09:00:00Z"),
    ]);
    await body.intake.settled();
    flushSync();
    return body;
  }

  it("is shown after the strip's pictures, saying why it was set aside", async () => {
    const { target } = await mountWithSetAside();

    target.querySelector<HTMLElement>(".aside .tile:not(.kept) button.view")?.click();
    flushSync();

    expect(text(viewer(target)?.querySelector(".meta span"))).toBe(
      "3 von 3 · Beiseitegelegt: Ähnlich",
    );
    expect(viewer(target)?.querySelector(".pill.remove")).toBeNull();
  });

  it("takes the picture in from the viewer and stays on it", async () => {
    const { intake, target } = await mountWithSetAside();
    target.querySelector<HTMLElement>(".aside .tile:not(.kept) button.view")?.click();
    flushSync();

    click(target, ".pill.take");

    expect(intake.pictures.state.pictures.map(({ fileName }) => fileName)).toContain("a.jpg");
    expect(target.querySelector(".aside")).toBeNull();
    expect(text(viewer(target)?.querySelector(".meta b"))).toBe("02.07.2025 · 14:02:10");
    expect(viewer(target)?.querySelector(".pill.take")).toBeNull();
  });
});
