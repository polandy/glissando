/** app-shell.css fades the shell out while it carries this attribute. */
const LEAVING_ATTRIBUTE = "data-leaving";
/** app-shell.css stops the logo's waiting breath while the shell carries this attribute. */
const FAILED_ATTRIBUTE = "data-failed";
const STAGE_SELECTOR = ".app-shell-stage";

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

/** A button under a message, e.g. to reload the page. */
export interface ReloadAction {
  readonly label: string;
  readonly run: () => void;
}

function alertWithAction(document: Document, message: string, action?: ReloadAction): HTMLElement {
  const alert = document.createElement("p");
  alert.className = "app-shell-failure";
  alert.setAttribute("role", "alert");
  alert.textContent = message;
  if (action !== undefined) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn large";
    button.textContent = action.label;
    button.addEventListener("click", action.run);
    alert.append(document.createElement("br"), button);
  }
  return alert;
}

/**
 * Replaces the running app in `target` with a message and a button, e.g. when a newer version
 * took over the library. The caller unmounts the app first.
 */
export function showInPlaceOfApp(target: HTMLElement, message: string, action: ReloadAction): void {
  const screen = target.ownerDocument.createElement("div");
  screen.className = "app-in-place-message";
  screen.append(alertWithAction(target.ownerDocument, message, action));
  target.replaceChildren(screen);
}

/**
 * Turns the app shell into the app's last word when it cannot start: the message appears under
 * the logo as an alert, with a button when `action` is given, and the shell, decoration until
 * now, is exposed to assistive technology.
 */
export function showStartupFailure(
  shell: HTMLElement,
  message: string,
  action?: ReloadAction,
): void {
  const stage = shell.querySelector(STAGE_SELECTOR);
  if (stage === null) {
    throw new Error(`The app shell has no ${STAGE_SELECTOR} to show the startup failure on`);
  }
  stage.append(alertWithAction(shell.ownerDocument, message, action));
  shell.removeAttribute("aria-hidden");
  shell.setAttribute(FAILED_ATTRIBUTE, "");
}
