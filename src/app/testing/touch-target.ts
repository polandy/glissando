/** Measuring what a finger actually reaches: hit-testing, not the size of a box. */

/** The platform guideline for a touch target (44 pt), in CSS px. */
export const MIN_TOUCH_TARGET = 44;
/** The probes stay this far inside the square's edge, so rounding cannot push one outside. */
const PROBE_INSET = 1;

export const INTERACTIVE_SELECTOR =
  'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="switch"], [role="radio"], [role="tab"], [tabindex="0"]';

/** The points of the minimum square centred on the box: centre, four corners, four edge middles. */
export function probePoints(box: DOMRect): { x: number; y: number }[] {
  const centreX = box.left + box.width / 2;
  const centreY = box.top + box.height / 2;
  const reach = MIN_TOUCH_TARGET / 2 - PROBE_INSET;
  return [-reach, 0, reach].flatMap((dx) =>
    [-reach, 0, reach].map((dy) => ({ x: centreX + dx, y: centreY + dy })),
  );
}

/** What a tap on the element lands on: the element itself, a part of it, or the label it sits in. */
function ownsHit(element: Element, hit: Element | null): boolean {
  if (hit === null) return false;
  if (element.contains(hit)) return true;
  const label = element.closest("label");
  return label !== null && label.contains(hit);
}

function isRendered(element: Element): boolean {
  const hiddenInput =
    element instanceof HTMLInputElement && getComputedStyle(element).opacity === "0";
  const shown = hiddenInput ? element.closest("label") : element;
  if (shown === null) return false;
  const box = shown.getBoundingClientRect();
  const style = getComputedStyle(shown);
  // An element that takes no pointer cannot be tapped, so its size is no concern.
  return (
    box.width > 0 &&
    box.height > 0 &&
    style.visibility !== "hidden" &&
    style.pointerEvents !== "none"
  );
}

/** The visible interactive elements under `root`. */
export function interactiveElements(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR)].filter(isRendered);
}

/**
 * The probe points of the element's minimum square at which a tap lands elsewhere, or none when
 * the whole square is the element's own. A visually hidden input stands for the label around it.
 */
export function missedProbes(element: HTMLElement): { x: number; y: number; hit: string }[] {
  const target =
    element instanceof HTMLInputElement && getComputedStyle(element).opacity === "0"
      ? (element.closest("label") ?? element)
      : element;
  target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  return probePoints(target.getBoundingClientRect()).flatMap(({ x, y }) => {
    const hit = document.elementFromPoint(x, y);
    return ownsHit(element, hit) ? [] : [{ x, y, hit: describeElement(hit) }];
  });
}

/** An element in a few words, for a failure message. */
export function describeElement(element: Element | null): string {
  if (element === null) return "nothing";
  const classes = [...element.classList]
    .filter((name) => !name.startsWith("svelte-"))
    .map((name) => `.${name}`)
    .join("");
  return `${element.tagName.toLowerCase()}${classes}`;
}

/** One line per element whose minimum square is not its own, for an assertion on `[]`. */
export function touchTargetViolations(root: ParentNode): string[] {
  return interactiveElements(root).flatMap((element) => {
    const misses = missedProbes(element);
    if (misses.length === 0) return [];
    const box = element.getBoundingClientRect();
    const label = element.getAttribute("aria-label") ?? element.textContent?.trim() ?? "";
    return [
      `${describeElement(element)} "${label}" ${Math.round(box.width)}x${Math.round(box.height)}: ` +
        `${misses.length}/9 probes hit ${[...new Set(misses.map((m) => m.hit))].join(", ")}`,
    ];
  });
}
