import { afterEach, describe, expect, it } from "vitest";
import { pickSaveTarget } from "./file-targets";

const PICKED_NAME = "picked-target.mp4";
const EARLIER_CONTENT = "the file the user chose to overwrite";
// Only a browser with the save picker picks a file (Chromium); the test stubs the picker itself.
const picksFiles = "showSaveFilePicker" in window;

/** A file in the origin private file system that stands in for the one the picker returns. */
async function pickedFile(content: string): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(PICKED_NAME, { create: true });
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  return handle;
}

describe("pickSaveTarget", () => {
  afterEach(async () => {
    Reflect.deleteProperty(window, "showSaveFilePicker");
    const root = await navigator.storage.getDirectory();
    await root.removeEntry(PICKED_NAME).catch(() => undefined);
  });

  it.skipIf(!picksFiles)(
    "leaves a picked file as it was when its export is aborted and discarded",
    async () => {
      const handle = await pickedFile(EARLIER_CONTENT);
      Reflect.set(window, "showSaveFilePicker", () => Promise.resolve(handle));
      const target = await pickSaveTarget(PICKED_NAME);
      if (target === null) throw new Error("the stubbed picker returned no file");

      const writer = (await target.open()).getWriter();
      await writer.write(new TextEncoder().encode("half an export"));
      await writer.abort();
      await target.discard();

      expect(target.kind).toBe("picked");
      expect(await (await handle.getFile()).text()).toBe(EARLIER_CONTENT);
    },
  );
});
