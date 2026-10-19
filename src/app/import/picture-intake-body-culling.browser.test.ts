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

function mountBody(checker: FakePictureChecker) {
  const intake = new PictureIntake(fakeIntakePorts(undefined, { checker }).ports);
  const body = mountWithTranslator(PictureIntakeBody, {
    intake,
    loadThumbnail: () => Promise.resolve(new Blob()),
    loadPicture: () => Promise.resolve(new Blob()),
    onError: () => undefined,
    onFiles: () => undefined,
    onDiscard: () => undefined,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    arrangement: null,
    sources: NO_SOURCES,
  });
  unmounts.push(body.destroy);
  return { intake, target: body.target };
}

/** Similar shots a, b (the sharpest) and c over two minutes, and one blurry picture among sharp ones. */
function similarAndBlurry() {
  const checker = new FakePictureChecker({
    "thumbnail a.jpg": measure(240),
    "thumbnail b.jpg": measure(455),
    "thumbnail c.jpg": measure(120),
    "thumbnail soft.jpg": measure(5, 1n),
    "thumbnail x.jpg": measure(900, 2n),
    "thumbnail y.jpg": measure(900, 3n),
  });
  const files = [
    pictureFile("a.jpg", "2025-07-02T14:02:10Z"),
    pictureFile("b.jpg", "2025-07-02T14:02:11Z"),
    pictureFile("c.jpg", "2025-07-02T14:03:30Z"),
    pictureFile("x.jpg", "2025-07-03T09:00:00Z"),
    pictureFile("soft.jpg", "2025-07-03T11:05:00Z"),
    pictureFile("y.jpg", "2025-07-04T13:30:00Z"),
  ];
  return { checker, files };
}

const text = (element: Element | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const stripTiles = (target: HTMLElement) => target.querySelectorAll(".strip .tile").length;
/** The strip's tiles; soft.jpg, the latest set aside, is the fifth once every picture is in. */
const tiles = (target: HTMLElement) => [...target.querySelectorAll(".strip .tile")];
/** The tile's own button: what a picture taken in from the aside focuses (`focusPicture`). */
const pickButton = (tile: Element | undefined) => tile?.querySelector("button.pick");
const SOFT_TILE = 4;
const takeButtons = (target: HTMLElement) => [
  ...target.querySelectorAll<HTMLButtonElement>("button.take"),
];

describe("PictureIntakeBody, the set-aside pictures", () => {
  it("counts the checks with a meter while pictures are checked", async () => {
    const { checker, files } = similarAndBlurry();
    checker.hold();
    const { intake, target } = mountBody(checker);

    intake.addPictures(files);
    await intake.pictures.settled();
    flushSync();

    expect(text(target.querySelector(".progress-row"))).toContain(
      "0 / 6 auf ähnliche Aufnahmen und Unschärfe geprüft",
    );
    expect(target.querySelector(".aside")).toBeNull();
  });

  it("groups similar shots with their kept picture and the blurry ones below the strip", async () => {
    const { checker, files } = similarAndBlurry();
    const { intake, target } = mountBody(checker);

    intake.addPictures(files);
    await intake.settled();
    flushSync();

    expect(stripTiles(target)).toBe(3);
    const aside = target.querySelector(".aside");
    expect(text(aside?.querySelector("h2"))).toBe("Beiseitegelegt · 3");
    const [similar, blurry] = [...(aside?.querySelectorAll(".group") ?? [])];
    expect(text(similar?.querySelector("h3"))).toBe(
      "Ähnlich · 02.07.2025 14:02–14:03 · das schärfste bleibt",
    );
    expect([...(similar?.querySelectorAll(".chip") ?? [])].map(text)).toEqual([
      "Behalten",
      "Ähnlich",
      "Ähnlich",
    ]);
    expect(text(blurry?.querySelector("h3"))).toBe("Unscharf");
    expect(takeButtons(target).map((button) => button.getAttribute("aria-label"))).toEqual([
      "Bild vom 02.07.2025 um 14:02:10 übernehmen",
      "Bild vom 02.07.2025 um 14:03:30 übernehmen",
      "Bild vom 03.07.2025 um 11:05:00 übernehmen",
    ]);
  });

  it("moves a picture into the strip with its +, focusing the next +", async () => {
    const { checker, files } = similarAndBlurry();
    const { intake, target } = mountBody(checker);
    intake.addPictures(files);
    await intake.settled();
    flushSync();

    takeButtons(target)[0]?.click();
    flushSync();

    expect(stripTiles(target)).toBe(4);
    expect(text(target.querySelector(".aside h2"))).toBe("Beiseitegelegt · 2");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Bild vom 02.07.2025 um 14:03:30 übernehmen",
    );
  });

  it("takes all in, and the section goes", async () => {
    const { checker, files } = similarAndBlurry();
    const { intake, target } = mountBody(checker);
    intake.addPictures(files);
    await intake.settled();
    flushSync();

    [...target.querySelectorAll<HTMLButtonElement>(".aside button")]
      .find((button) => text(button) === "Alle übernehmen")
      ?.click();
    flushSync();

    expect(stripTiles(target)).toBe(6);
    expect(document.activeElement).toBe(pickButton(tiles(target)[SOFT_TILE]));
    expect(target.querySelector(".aside")).toBeNull();
  });

  it("moves the focus to the ✕ in the strip of the picture the last + took in", async () => {
    const { checker, files } = similarAndBlurry();
    const { intake, target } = mountBody(checker);
    intake.addPictures(files);
    await intake.settled();
    flushSync();

    while (takeButtons(target).length > 0) {
      takeButtons(target)[0]?.click();
      flushSync();
    }

    expect(stripTiles(target)).toBe(6);
    expect(document.activeElement).toBe(pickButton(tiles(target)[SOFT_TILE]));
    expect(target.querySelector(".aside")).toBeNull();
  });

  it("names a group whose kept picture was removed without the sharpest being kept", async () => {
    const { checker, files } = similarAndBlurry();
    const { intake, target } = mountBody(checker);
    intake.addPictures(files);
    await intake.settled();
    const kept = intake.culling.state.groups[0];

    intake.removePicture(kept?.kind === "similar" ? kept.keptId : "");
    flushSync();

    expect(text(target.querySelector(".aside .group h3"))).toBe("Ähnlich · 02.07.2025 14:02–14:03");
  });
});
