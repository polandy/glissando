/** The CSS custom property `Toast.svelte` adds to its distance from the viewport's bottom. */
const TOAST_CLEARANCE_PROPERTY = "--gl-toast-clearance";

/**
 * Svelte action for a bar fixed to the viewport's bottom: while it is mounted, toasts rise above
 * it, so they never cover its buttons. The clearance runs from the viewport's bottom to the bar's
 * top, so a bar floating above the edge (an inset) is cleared too.
 */
export function keepToastsClear(bar: HTMLElement): { destroy(): void } {
  const root = bar.ownerDocument.documentElement;
  const view = bar.ownerDocument.defaultView;
  const publish = () =>
    root.style.setProperty(
      TOAST_CLEARANCE_PROPERTY,
      `${root.clientHeight - bar.getBoundingClientRect().top}px`,
    );
  publish();
  const observer = new ResizeObserver(publish);
  observer.observe(bar);
  view?.addEventListener("resize", publish);
  return {
    destroy() {
      observer.disconnect();
      view?.removeEventListener("resize", publish);
      root.style.removeProperty(TOAST_CLEARANCE_PROPERTY);
    },
  };
}
