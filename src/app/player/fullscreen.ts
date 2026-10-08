/**
 * The Fullscreen API where the browser has it. A refusal is expected (no user gesture, iPhone
 * Safari without element fullscreen), so it is logged at debug level and never thrown.
 */
export function enterFullscreen(element: HTMLElement): void {
  if (!document.fullscreenEnabled || document.fullscreenElement !== null) {
    return;
  }
  element.requestFullscreen().catch((error: unknown) => {
    console.debug("the browser refused fullscreen", error);
  });
}

export function exitFullscreen(): void {
  if (document.fullscreenElement === null) {
    return;
  }
  document.exitFullscreen().catch((error: unknown) => {
    console.debug("the browser did not leave fullscreen", error);
  });
}

export function toggleFullscreen(element: HTMLElement): void {
  if (document.fullscreenElement === null) {
    enterFullscreen(element);
  } else {
    exitFullscreen();
  }
}
