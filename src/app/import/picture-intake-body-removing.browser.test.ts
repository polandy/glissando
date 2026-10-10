import { createRawSnippet, flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { fakeIntakePorts, pictureFile } from "../testing/picture-intake-ports";
import { PictureIntake } from "./picture-intake";
import PictureIntakeBody from "./PictureIntakeBody.svelte";

const NO_SOURCES = createRawSnippet(() => ({ render: () => "<div></div>" }));

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) {
    unmount();
  }
  unmounts = [];
});

async function mountWithPictures(...names: string[]) {
  const { ports, toaster } = fakeIntakePorts();
  const intake = new PictureIntake(ports);
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
  intake.addPictures(names.map((name, day) => pictureFile(name, `2025-07-0${day + 1}T10:00:00Z`)));
  await intake.pictures.settled();
  flushSync();
  return { intake, toaster, target: body.target, destroy: body.destroy };
}

const removeButtons = (target: HTMLElement): HTMLButtonElement[] => [
  ...target.querySelectorAll<HTMLButtonElement>(".strip .tile button.remove"),
];

const storedNames = (intake: PictureIntake): string[] =>
  intake.pictures.state.pictures.map(({ fileName }) => fileName);

describe("PictureIntakeBody, removing a chosen picture", () => {
  it("gives every stored tile a remove button named by the picture's date", async () => {
    const { target } = await mountWithPictures("beach.jpg", "hill.jpg");

    const buttons = removeButtons(target);

    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.getAttribute("aria-label")).toMatch(/^Bild vom .*1.* entfernen$/);
  });

  it("removes the picture on its button, with the undo toast", async () => {
    const { intake, toaster, target } = await mountWithPictures("beach.jpg", "hill.jpg");

    removeButtons(target)[0]?.click();
    flushSync();

    expect(storedNames(intake)).toEqual(["hill.jpg"]);
    expect(removeButtons(target)).toHaveLength(1);
    expect(toaster.current?.text).toBe("1 picture removed");
  });

  it("removes the picture on Delete and Backspace and moves the focus to the next one's button", async () => {
    const { intake, target } = await mountWithPictures("a.jpg", "b.jpg", "c.jpg");
    const [first] = removeButtons(target);
    first?.focus();

    first?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    flushSync();
    expect(storedNames(intake)).toEqual(["b.jpg", "c.jpg"]);
    expect(document.activeElement).toBe(removeButtons(target)[0]);

    removeButtons(target)[1]?.focus();
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }),
    );
    flushSync();
    expect(storedNames(intake)).toEqual(["b.jpg"]);
    expect(document.activeElement).toBe(removeButtons(target)[0]);
  });

  it("moves the focus to Choose pictures once the last picture is removed", async () => {
    const { intake, target } = await mountWithPictures("beach.jpg");

    removeButtons(target)[0]?.click();
    flushSync();

    expect(storedNames(intake)).toEqual([]);
    expect(document.activeElement?.textContent.trim()).toBe("Bilder auswählen");
  });

  it("makes the removals final on leaving the step", async () => {
    const { intake, toaster, target, destroy } = await mountWithPictures("beach.jpg", "hill.jpg");
    removeButtons(target)[0]?.click();
    flushSync();
    expect(toaster.current).not.toBeNull();

    destroy();

    expect(storedNames(intake)).toEqual(["hill.jpg"]);
    expect(toaster.current).toBeNull();
  });
});
