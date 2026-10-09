/**
 * Watches the end of an endless list: calls `onVisible` when `element` comes near the viewport,
 * and once at the start if it already is. Returns the stop. Injected, so a test can say when the
 * end is in view instead of scrolling.
 */
export type EndObserver = (element: Element, onVisible: () => void) => () => void;

/** How far below the viewport the next page is asked for, so it is there before it is needed. */
const LOOK_AHEAD = "0px 0px 400px 0px";

export const browserEndObserver: EndObserver = (element, onVisible) => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onVisible();
    },
    { rootMargin: LOOK_AHEAD },
  );
  observer.observe(element);
  return () => observer.disconnect();
};
