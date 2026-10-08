/** The CSS custom property `Toast.svelte` adds to its distance from the viewport's bottom. */
const TOAST_CLEARANCE_PROPERTY = "--gl-toast-clearance";

/**
 * Svelte action for a bar fixed to the viewport's bottom: while it is mounted, toasts rise above
 * it, following its height, so they never cover its buttons.
 */
export function keepToastsClear(bar: HTMLElement): { destroy(): void } {
  const root = bar.ownerDocument.documentElement;
  const publish = () => root.style.setProperty(TOAST_CLEARANCE_PROPERTY, `${bar.offsetHeight}px`);
  publish();
  const observer = new ResizeObserver(publish);
  observer.observe(bar);
  return {
    destroy() {
      observer.disconnect();
      root.style.removeProperty(TOAST_CLEARANCE_PROPERTY);
    },
  };
}
