import type { Attachment } from "svelte/attachments";

/** Set on the bar's action row when its actions take two lines; CSS lays them out by it. */
const ACTION_LINES_ATTRIBUTE = "data-lines";
/** The custom property holding how many columns the two lines share. */
const ACTION_COLUMNS_PROPERTY = "--action-columns";
const TWO_LINES = "2";

/** How many columns two even lines of `count` actions need: the first line takes the odd one. */
function twoLineColumns(count: number): number {
  return Math.ceil(count / 2);
}

/**
 * Lays the phone bar's action row out on one line where every action fits at its narrowest,
 * otherwise on two even lines, so no action ever hides off-screen. A row shown inline (a wide
 * screen, `display: contents`) stays as it is.
 */
function balanceActionLines(row: HTMLElement): void {
  row.removeAttribute(ACTION_LINES_ATTRIBUTE);
  row.style.removeProperty(ACTION_COLUMNS_PROPERTY);
  if (getComputedStyle(row).display === "contents") return;
  if (row.scrollWidth <= row.clientWidth) return;
  row.setAttribute(ACTION_LINES_ATTRIBUTE, TWO_LINES);
  row.style.setProperty(ACTION_COLUMNS_PROPERTY, String(twoLineColumns(row.childElementCount)));
}

/**
 * Attachment for the action row: balances it now, again whenever the bar's width changes, and
 * again whenever the actions shown change: a new `actionKeys` array re-creates the attachment.
 * Balancing changes the bar's height, so it waits for the next frame rather than running inside
 * the resize observation, which the browser would report as a resize loop; a change of height
 * alone never rebalances.
 */
export function actionLines(actionKeys: readonly string[]): Attachment<HTMLElement> {
  // Only the template's passing of the keys matters: it makes Svelte re-create the attachment.
  void actionKeys;
  return (row) => {
    balanceActionLines(row);
    const bar = row.parentElement;
    if (bar === null) return;
    let balancedWidth = bar.clientWidth;
    let pending = 0;
    const observer = new ResizeObserver(() => {
      if (bar.clientWidth === balancedWidth || pending !== 0) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        balancedWidth = bar.clientWidth;
        balanceActionLines(row);
      });
    });
    observer.observe(bar);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
    };
  };
}
