import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredPicture, StoredSlideshow } from "../../library/stored-slideshow";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { whenRendered } from "../testing/when-rendered";
import ServerCopyConfirm from "./ServerCopyConfirm.svelte";

const picture = (id: string, immichAssetId?: string): StoredPicture => ({
  id,
  capturedAt: "2025-07-01T10:00:00Z",
  width: 3,
  height: 2,
  fileName: `${id}.jpg`,
  ...(immichAssetId === undefined ? {} : { immichAssetId }),
});

const SHOW: StoredSlideshow = {
  id: "show",
  title: "July",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [picture("a", "x"), picture("IMG_9")],
  secondsPerPicture: 5,
  music: { id: "m", fileName: "song.mp3", durationMs: 1000, mimeType: "audio/mpeg" },
};

let destroy = () => {};
afterEach(() => destroy());

type CopyAction = "keepCopy" | "saveOnServer";

/** `afterClose`: the action the parent passes once the sheet asked it to close. */
function mountConfirm(action: CopyAction, afterClose: CopyAction = action) {
  const ran: string[] = [];
  const closed: true[] = [];
  const mounted = mountWithTranslator(
    ServerCopyConfirm,
    {
      // A getter, as Svelte passes a parent's state: it reads the parent's value now.
      get action() {
        return closed.length === 0 ? action : afterClose;
      },
      stored: SHOW,
      store: { musicBlob: () => Promise.resolve(new Blob(["x".repeat(3)])) },
      onKeepCopy: (slideshow: StoredSlideshow) => ran.push(`keep ${slideshow.id}`),
      onSaveOnServer: (slideshow: StoredSlideshow) => ran.push(`save ${slideshow.id}`),
      onClose: () => closed.push(true),
      onError: (error: unknown) => {
        throw error;
      },
    },
    { current: createTranslator("en") },
  );
  destroy = mounted.destroy;
  return { ...mounted, ran, closed };
}

function buttonNamed(name: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>("dialog button")].find(
    (button) => button.textContent.trim() === name,
  );
  if (found === undefined) throw new Error(`no button "${name}"`);
  return found;
}

describe("ServerCopyConfirm", () => {
  it("asks before keeping a copy and runs it only once confirmed", () => {
    const { ran, closed } = mountConfirm("keepCopy");

    expect(document.querySelector("dialog h3")?.textContent).toBe("Keep a copy on this device?");
    expect(ran).toEqual([]);
    buttonNamed("Download and keep").click();
    flushSync();

    expect(ran).toEqual(["keep show"]);
    expect(closed).toEqual([true]);
  });

  it("runs the copy it asked about, though closing it changes what the parent passes", () => {
    const { ran } = mountConfirm("keepCopy", "saveOnServer");

    buttonNamed("Download and keep").click();
    flushSync();

    expect(ran).toEqual(["keep show"]);
  });

  it("cancelling runs nothing", () => {
    const { ran, closed } = mountConfirm("keepCopy");

    buttonNamed("Cancel").click();

    expect(closed).toEqual([true]);
    expect(ran).toEqual([]);
  });

  it("lists the pictures only on this device before saving without them", async () => {
    const { target, ran } = mountConfirm("saveOnServer");

    const list = await whenRendered(document.body, "dialog li");
    expect(target.isConnected).toBe(true);
    expect(list.textContent).toBe("IMG_9.jpg");
    buttonNamed("Save without this one").click();

    expect(ran).toEqual(["save show"]);
  });
});
