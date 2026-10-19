import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { FakeDecoder } from "../../import/testing/picture-import-fixtures";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";
import PicturesProgress from "./PicturesProgress.svelte";

const english = { current: createTranslator("en") };

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountProgress(intake: PictureIntake, onStopPick: (pickId: string) => void = () => {}) {
  const mounted = mountWithTranslator(
    PicturesProgress,
    {
      state: intake.pictures.state,
      checking: intake.culling.state.checking,
      range: null,
      onCancel: () => {},
      onStopPick,
      onAddMore: null,
      onMoreFromImmich: null,
    },
    english,
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

const rowText = (target: HTMLElement): string[] =>
  [...target.querySelectorAll(".queue-row")].map((row) =>
    row.textContent.replace(/\s+/g, " ").trim(),
  );

describe("PicturesProgress, the queue of picks being imported", () => {
  it("shows the header share, the running pick's k/n, a later pick waiting, by pick order", async () => {
    const decoder = new FakeDecoder();
    const { ports } = fakeIntakePorts(undefined, { decode: decoder.decode });
    const intake = new PictureIntake(ports);
    decoder.hold();
    intake.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await decoder.reached;
    intake.addPictures([pictureFile("b.jpg", "2025-07-02T10:00:00Z")]);

    const target = mountProgress(intake);

    expect(target.querySelector(".queue-head")?.textContent).toContain("0 of 2 ready");
    expect(target.querySelector(".queue-head")?.textContent).toContain("2 left");
    const rows = rowText(target);
    expect(rows[0]).toContain("0 / 1");
    expect(rows[1]).toContain("waiting");
    decoder.open();
    await intake.settled();
  });

  it("marks a finished pick with a check mark and gives it no stop button", async () => {
    const decoder = new FakeDecoder();
    const { ports } = fakeIntakePorts(undefined, { decode: decoder.decode });
    const intake = new PictureIntake(ports);
    intake.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await intake.settled();
    decoder.hold();
    intake.addPictures([pictureFile("b.jpg", "2025-07-02T10:00:00Z")]);
    await decoder.reached;

    const target = mountProgress(intake);

    const rows = rowText(target);
    expect(rows[0]).toContain("1 ✓");
    expect(target.querySelectorAll(".queue-row")[0]?.querySelector("button.stop")).toBeNull();
    expect(target.querySelectorAll(".queue-row")[1]?.querySelector("button.stop")).not.toBeNull();
    decoder.open();
    await intake.settled();
  });

  it("stops the pick its row's ✕ names", async () => {
    const decoder = new FakeDecoder();
    const { ports } = fakeIntakePorts(undefined, { decode: decoder.decode });
    const intake = new PictureIntake(ports);
    decoder.hold();
    intake.addPictures([pictureFile("a.jpg", "2025-07-01T10:00:00Z")]);
    await decoder.reached;
    const stopped: string[] = [];

    const target = mountProgress(intake, (pickId) => stopped.push(pickId));
    target.querySelector<HTMLButtonElement>(".queue-row button.stop")?.click();
    flushSync();

    expect(stopped).toEqual(["pick-1"]);
    decoder.open();
    await intake.settled();
  });
});
