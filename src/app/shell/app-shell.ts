/** app-shell.css fades the shell out while it carries this attribute. */
const LEAVING_ATTRIBUTE = "data-leaving";

function fadesOut(shell: HTMLElement): boolean {
  const view = shell.ownerDocument.defaultView;
  if (view === null) {
    return false;
  }
  return view
    .getComputedStyle(shell)
    .transitionDuration.split(",")
    .some((duration) => Number.parseFloat(duration) > 0);
}

/**
 * Hands the screen from index.html's app shell to the rendered app: the shell fades out over the
 * app and is removed once the fade ends, or at once where it has none (reduced motion).
 */
export function handOverFromShell(shell: HTMLElement): Promise<void> {
  shell.setAttribute(LEAVING_ATTRIBUTE, "");
  if (!fadesOut(shell)) {
    shell.remove();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const removeAfterFade = (event: Event): void => {
      if (event.target !== shell) {
        return;
      }
      shell.removeEventListener("transitionend", removeAfterFade);
      shell.removeEventListener("transitioncancel", removeAfterFade);
      shell.remove();
      resolve();
    };
    shell.addEventListener("transitionend", removeAfterFade);
    shell.addEventListener("transitioncancel", removeAfterFade);
  });
}
