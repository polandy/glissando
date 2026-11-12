import { describe, expect, it } from "vitest";
import { ImmichUnavailableError } from "../../immich/immich-client";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import type { KeepCopyOptions } from "../../server-library/keep-copy";
import {
  ServerLibraryRefusedError,
  ServerLibraryUnavailableError,
} from "../../server-library/server-library-client";
import { PictureMissingFromImmichError } from "../../server-library/server-slideshow-store";
import { createTranslator } from "../i18n/translator";
import type { ToastMessage } from "../toast/toaster";
import { ServerCopyFlows } from "./server-copy-flows";

const SHOW: StoredSlideshow = {
  id: "server-1",
  title: "Iceland 2025",
  createdAt: "2025-07-02T08:00:00Z",
  pictures: [
    {
      id: "asset-1",
      capturedAt: "2025-07-01T10:00:00Z",
      width: 3,
      height: 2,
      fileName: "a",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};

type Answer = StoredSlideshow | Error | Promise<StoredSlideshow>;

function setUp() {
  const toasts: ToastMessage[] = [];
  const opened: string[] = [];
  const errors: unknown[] = [];
  const addedTo: [string, string[]][] = [];
  const copyAnswers: Answer[] = [];
  const saveAnswers: Answer[] = [];
  const copyOptions: KeepCopyOptions[] = [];
  const answer = (queue: Answer[]) => {
    const next = queue.shift();
    if (next === undefined) throw new Error("no answer queued");
    if (next instanceof Promise) return next;
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  };
  const flows = new ServerCopyFlows({
    serverLibrary: {
      keepCopy: (_slideshow, options) => {
        copyOptions.push(options);
        options.onProgress?.(0.34);
        return answer(copyAnswers);
      },
      saveOnServer: () => answer(saveAnswers),
    },
    deviceStore: { listSlideshows: () => Promise.resolve([{ ...SHOW, id: "d", title: "Taken" }]) },
    toaster: { show: (toast) => void toasts.push(toast) },
    open: (id) => void opened.push(id),
    addFiles: (copy, files) => void addedTo.push([copy.id, files.map(({ name }) => name)]),
    reportError: (error) => void errors.push(error),
    log: () => undefined,
    translator: createTranslator("en"),
  });
  const seen: string[][] = [];
  flows.subscribe((copies) =>
    seen.push(copies.map(({ slideshowId, fraction }) => `${slideshowId} ${String(fraction)}`)),
  );
  return { flows, toasts, opened, errors, addedTo, copyAnswers, saveAnswers, copyOptions, seen };
}

describe("keeping a copy of a server slideshow on this device", () => {
  it("shows its progress in the header, then a toast whose Open opens the copy", async () => {
    const { flows, toasts, opened, copyAnswers, copyOptions, seen } = setUp();
    copyAnswers.push({ ...SHOW, id: "copy-1" });

    await flows.keepCopy(SHOW);

    expect(copyOptions[0]?.existingTitles).toEqual(["Taken"]);
    expect(seen).toEqual([[], ["server-1 0"], ["server-1 0.34"], []]);
    expect(toasts.map(({ text }) => text)).toEqual(["Copied to this device"]);
    toasts[0]?.action?.run();
    expect(opened).toEqual(["copy-1"]);
  });

  it("shows each of two copies running at once until that one ends", async () => {
    const { flows, toasts, copyAnswers, seen } = setUp();
    const first = Promise.withResolvers<StoredSlideshow>();
    copyAnswers.push(first.promise, { ...SHOW, id: "copy-2" });

    const firstCopy = flows.keepCopy(SHOW);
    await flows.keepCopy({ ...SHOW, id: "server-2", title: "Lisbon" });

    expect(seen.at(-1)).toEqual(["server-1 0.34"]);
    expect(seen).toContainEqual(["server-1 0.34", "server-2 0.34"]);
    first.resolve({ ...SHOW, id: "copy-1" });
    await firstCopy;
    expect(seen.at(-1)).toEqual([]);
    expect(toasts.map(({ text }) => text)).toEqual([
      "Copied to this device",
      "Copied to this device",
    ]);
  });

  it("joins a copy of the same slideshow already running instead of starting a second", async () => {
    const { flows, toasts, copyAnswers, copyOptions } = setUp();
    const running = Promise.withResolvers<StoredSlideshow>();
    copyAnswers.push(running.promise);

    const first = flows.keepCopy(SHOW);
    const second = flows.keepCopy(SHOW);
    running.resolve({ ...SHOW, id: "copy-1" });
    await Promise.all([first, second]);

    expect(toasts.map(({ text }) => text)).toEqual(["Copied to this device"]);
    expect(copyOptions).toHaveLength(1);
  });

  it("tells when a picture is no longer in Immich", async () => {
    const { flows, toasts, copyAnswers, errors } = setUp();
    copyAnswers.push(new PictureMissingFromImmichError("asset-1"));

    await flows.keepCopy(SHOW);

    expect(toasts.map(({ text, tone }) => [text, tone])).toEqual([
      ["A picture is no longer in Immich. Remove it, then the copy works.", "error"],
    ]);
    expect(errors).toEqual([]);
  });

  it("offers to try again when the server is not answering", async () => {
    const { flows, toasts, copyAnswers } = setUp();
    copyAnswers.push(new ServerLibraryUnavailableError("a picture"), { ...SHOW, id: "copy-1" });

    await flows.keepCopy(SHOW);
    expect(toasts[0]?.text).toBe("Couldn't copy the slideshow.");
    toasts[0]?.action?.run();
    await flows.settled();

    expect(toasts.map(({ text }) => text)).toContain("Copied to this device");
  });
});

describe("adding files from this device to a server slideshow", () => {
  const FILES = [new File(["x"], "beach.jpg"), new File(["y"], "dune.jpg")];

  it("copies it to this device with its progress, then adds the files to the copy", async () => {
    const { flows, toasts, addedTo, copyAnswers, seen } = setUp();
    copyAnswers.push({ ...SHOW, id: "copy-1" });

    await flows.keepCopyAndAdd(SHOW, FILES);

    expect(seen).toEqual([[], ["server-1 0"], ["server-1 0.34"], []]);
    expect(addedTo).toEqual([["copy-1", ["beach.jpg", "dune.jpg"]]]);
    expect(toasts).toEqual([]);
  });

  it.each([
    [
      new PictureMissingFromImmichError("asset-1"),
      "A picture is no longer in Immich. Remove it, then the copy works.",
    ],
    [new ImmichUnavailableError("unreachable"), "Couldn't copy the slideshow."],
    [new ServerLibraryUnavailableError("the music"), "Couldn't copy the slideshow."],
  ])("drops the files when the copy fails with %s", async (failure, text) => {
    const { flows, toasts, addedTo, copyAnswers, errors, seen } = setUp();
    copyAnswers.push(failure);

    await flows.keepCopyAndAdd(SHOW, FILES);

    expect(toasts.map((toast) => [toast.text, toast.tone, toast.action])).toEqual([
      [text, "error", undefined],
    ]);
    expect(seen.at(-1)).toEqual([]);
    expect(addedTo).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("adds the files to a copy of the same slideshow already running", async () => {
    const { flows, toasts, addedTo, copyAnswers, copyOptions } = setUp();
    const running = Promise.withResolvers<StoredSlideshow>();
    copyAnswers.push(running.promise);

    const kept = flows.keepCopy(SHOW);
    const adding = flows.keepCopyAndAdd(SHOW, FILES);
    running.resolve({ ...SHOW, id: "copy-1" });
    await Promise.all([kept, adding]);

    expect(copyOptions).toHaveLength(1);
    expect(toasts.map(({ text }) => text)).toEqual(["Copied to this device"]);
    expect(addedTo).toEqual([["copy-1", ["beach.jpg", "dune.jpg"]]]);
  });
});

describe("saving a device slideshow on the server", () => {
  it("shows a toast whose Open opens the server's copy", async () => {
    const { flows, toasts, opened, saveAnswers } = setUp();
    saveAnswers.push({ ...SHOW, id: "server-2" });

    await flows.saveOnServer(SHOW);

    expect(toasts.map(({ text }) => text)).toEqual(["Saved on the server"]);
    toasts[0]?.action?.run();
    expect(opened).toEqual(["server-2"]);
  });

  it("tells when the server is not answering", async () => {
    const { flows, toasts, saveAnswers, errors } = setUp();
    saveAnswers.push(new ServerLibraryUnavailableError("the slideshow"));

    await flows.saveOnServer(SHOW);

    expect(toasts.map(({ text, tone }) => [text, tone])).toEqual([
      ["Couldn't save on the server. Your Glissando server isn't answering.", "error"],
    ]);
    expect(errors).toEqual([]);
  });

  it.each([
    [413, "tooLarge", "music", "Couldn't save on the server: the music is larger than 200 MB."],
    [
      413,
      "tooLarge",
      "slideshow",
      "Couldn't save on the server: the slideshow is larger than 2 MB.",
    ],
    [409, "musicMissing", "slideshow", "Your Glissando server refused the slideshow."],
  ] as const)(
    "tells when the server refuses with %i %s for the %s",
    async (status, code, refused, text) => {
      const { flows, toasts, saveAnswers, errors } = setUp();
      saveAnswers.push(new ServerLibraryRefusedError("POST", status, code, "detail", refused));

      await flows.saveOnServer(SHOW);

      expect(toasts.map((toast) => [toast.text, toast.tone])).toEqual([[text, "error"]]);
      expect(errors).toEqual([]);
    },
  );
});
