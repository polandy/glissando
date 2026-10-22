import { flushSync } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import OwnMusicRow from "./OwnMusicRow.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mountRow(onFiles: (files: File[]) => void = () => {}) {
  const mounted = mountWithTranslator(OwnMusicRow, {
    onFiles,
    onError: () => {},
    onChoose: () => {},
  });
  unmounts.push(mounted.destroy);
  return mounted.target;
}

const row = (target: HTMLElement) => target.querySelector(".drop");

/**
 * A synthetic drag carrying `files`, without filesystem entries (`webkitGetAsEntry` stays null,
 * as for a drop with no real OS-backed entry; `dropped-files.test.ts` covers entries themselves).
 */
function dragEventWith(type: string, files: File[]): DragEvent {
  const dataTransfer = new DataTransfer();
  for (const file of files) {
    dataTransfer.items.add(file);
    const item = dataTransfer.items[dataTransfer.items.length - 1];
    Object.defineProperty(item, "webkitGetAsEntry", { value: () => null });
  }
  return new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true });
}

describe("OwnMusicRow, the own-music drop target", () => {
  it("shows no dashed accent until something is dragged over it", () => {
    const target = mountRow();

    expect(row(target)?.classList.contains("hover")).toBe(false);
  });

  it("shows the dashed accent while a drag is over it, and clears it when the drag leaves", () => {
    const target = mountRow();
    const dropTarget = row(target);

    dropTarget?.dispatchEvent(dragEventWith("dragover", []));
    flushSync();
    expect(dropTarget?.classList.contains("hover")).toBe(true);

    dropTarget?.dispatchEvent(new DragEvent("dragleave", { bubbles: true }));
    flushSync();
    expect(dropTarget?.classList.contains("hover")).toBe(false);
  });

  it("reports the dropped files and clears the dashed accent", async () => {
    const onFiles = vi.fn();
    const target = mountRow(onFiles);
    const dropTarget = row(target);
    const file = new File(["sound"], "song.mp3", { type: "audio/mpeg" });

    dropTarget?.dispatchEvent(dragEventWith("dragover", []));
    dropTarget?.dispatchEvent(dragEventWith("drop", [file]));
    flushSync();

    expect(dropTarget?.classList.contains("hover")).toBe(false);
    await vi.waitFor(() => expect(onFiles).toHaveBeenCalledWith([file]));
  });
});
