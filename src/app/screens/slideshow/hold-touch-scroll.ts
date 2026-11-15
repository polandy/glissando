/**
 * A lifted touch owns the finger: the page must not scroll under it (ADR-0019). The browser treats
 * a window-level touchmove as passive by default, so this needs an explicit listener. Returns its
 * removal.
 */
export function holdTouchScroll(lifted: () => boolean): () => void {
  const preventWhileLifted = (event: TouchEvent): void => {
    if (lifted()) {
      event.preventDefault();
    }
  };
  window.addEventListener("touchmove", preventWhileLifted, { passive: false });
  return () => window.removeEventListener("touchmove", preventWhileLifted);
}
