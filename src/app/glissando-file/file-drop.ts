import type { Action } from "svelte/action";

const FILES_TYPE = "Files";

export interface FileDropOptions {
  /** A drag carrying files is over the element (true) or left it (false). */
  onDragging(dragging: boolean): void;
  /** The first file dropped. */
  onFile(file: File): void;
}

/** Lets files be dropped anywhere on the element; drags carrying no files are left alone. */
export const fileDrop: Action<HTMLElement, FileDropOptions> = (node, initial) => {
  let options = initial;
  const carriesFiles = (event: DragEvent): boolean =>
    event.dataTransfer?.types.includes(FILES_TYPE) ?? false;

  function over(event: DragEvent): void {
    if (carriesFiles(event)) {
      event.preventDefault();
      options.onDragging(true);
    }
  }
  function leave(event: DragEvent): void {
    // Moving onto a child also fires dragleave; only leaving the element counts.
    if (!(event.relatedTarget instanceof Node && node.contains(event.relatedTarget))) {
      options.onDragging(false);
    }
  }
  function drop(event: DragEvent): void {
    if (!carriesFiles(event)) {
      return;
    }
    event.preventDefault();
    options.onDragging(false);
    const file = event.dataTransfer?.files[0];
    if (file !== undefined) {
      options.onFile(file);
    }
  }

  node.addEventListener("dragover", over);
  node.addEventListener("dragleave", leave);
  node.addEventListener("drop", drop);
  return {
    update(next) {
      options = next;
    },
    destroy() {
      node.removeEventListener("dragover", over);
      node.removeEventListener("dragleave", leave);
      node.removeEventListener("drop", drop);
    },
  };
};
