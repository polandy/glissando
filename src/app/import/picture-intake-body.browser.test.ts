import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { PictureIdentity } from "../../library/picture-identity";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";
import PictureIntakeBody from "./PictureIntakeBody.svelte";

const BEACH_AT = "2025-07-01T10:00:00Z";
const HILL_AT = "2025-07-02T10:00:00Z";
const NO_SOURCES = createRawSnippet(() => ({ render: () => "<div></div>" }));

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

function mountBody(known: readonly PictureIdentity[]) {
  const intake = new PictureIntake(fakeIntakePorts().ports, known);
  const body = mountWithTranslator(PictureIntakeBody, {
    intake,
    loadThumbnail: () => Promise.resolve(new Blob()),
    onError: () => undefined,
    onFiles: () => undefined,
    onDiscard: () => undefined,
    immich: { kind: "notSetUp" },
    onOpenImmich: () => undefined,
    sources: NO_SOURCES,
  });
  unmounts.push(body.destroy);
  return { intake, target: body.target };
}

async function settle(intake: PictureIntake): Promise<void> {
  await intake.pictures.settled();
  flushSync();
}

const warnings = (target: HTMLElement): string[] =>
  [...target.querySelectorAll(".notice.warn")].map((notice) => notice.textContent);

const tileCount = (target: HTMLElement): number => target.querySelectorAll(".strip .tile").length;

describe("PictureIntakeBody's duplicates notices", () => {
  it("names the pictures already in the slideshow and those chosen twice in their own sentences", async () => {
    const { intake, target } = mountBody([{ fileName: "beach.jpg", capturedAt: BEACH_AT }]);

    intake.addPictures([
      pictureFile("beach.jpg", BEACH_AT),
      pictureFile("hill.jpg", HILL_AT),
      pictureFile("hill.jpg", HILL_AT),
    ]);
    await settle(intake);

    const [alreadyIn, chosenTwice] = warnings(target);
    expect(alreadyIn).toContain("1 Bild ist schon in der Diashow und wird übersprungen:");
    expect(alreadyIn).toContain("beach.jpg.");
    expect(alreadyIn).toContain("Trotzdem hinzufügen");
    expect(chosenTwice).toContain("1 Bild wurde doppelt gewählt und wird übersprungen:");
    expect(chosenTwice).toContain("hill.jpg.");
    expect(chosenTwice).toContain("Trotzdem hinzufügen");
  });

  it("takes the pictures already in the slideshow in after all on their Add anyway", async () => {
    const { intake, target } = mountBody([{ fileName: "beach.jpg", capturedAt: BEACH_AT }]);
    intake.addPictures([pictureFile("beach.jpg", BEACH_AT), pictureFile("hill.jpg", HILL_AT)]);
    await settle(intake);
    expect(tileCount(target)).toBe(1);

    const notice = target.querySelector(".notice.warn");
    [...(notice?.querySelectorAll("button") ?? [])]
      .find((button) => button.textContent.trim() === "Trotzdem hinzufügen")
      ?.click();
    await settle(intake);

    expect(tileCount(target)).toBe(2);
    expect(warnings(target)).toEqual([]);
  });

  it("for a new slideshow says a picture was chosen twice, never that it is in the slideshow", async () => {
    const { intake, target } = mountBody([]);

    intake.addPictures([pictureFile("hill.jpg", HILL_AT), pictureFile("hill.jpg", HILL_AT)]);
    await settle(intake);

    const notices = warnings(target);
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("1 Bild wurde doppelt gewählt und wird übersprungen:");
    expect(notices[0]).not.toContain("schon in der Diashow");
  });
});
