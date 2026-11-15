/**
 * The attribute on both tiles of a portrait pair (ADR-0028) the strip cannot show side by side:
 * a row break, or a chapter tile, falls between them. Their shared plate stays open there.
 */
export const PAIR_CUT_ATTRIBUTE = "data-pair-cut";

/** The classes `StripTile` gives a pair's first and second tile. */
const PAIRED_FIRST = "paired-first";
const PAIRED_SECOND = "paired-second";

/**
 * Marks every pair of the strip's tiles that sits apart. The grid fills its columns by width, so
 * only the laid-out tiles tell where its rows break.
 */
export function markPairCuts(strip: HTMLElement): void {
  let first: HTMLElement | null = null;
  for (const tile of strip.querySelectorAll<HTMLElement>(
    `:scope > .${PAIRED_FIRST}, :scope > .${PAIRED_SECOND}`,
  )) {
    if (tile.classList.contains(PAIRED_FIRST)) {
      first = tile;
      continue;
    }
    if (first !== null) {
      const cut = first.nextElementSibling !== tile || first.offsetTop !== tile.offsetTop;
      first.toggleAttribute(PAIR_CUT_ATTRIBUTE, cut);
      tile.toggleAttribute(PAIR_CUT_ATTRIBUTE, cut);
      first = null;
    }
  }
}

/**
 * An attachment for the strip: marks its cut pairs now and whenever its width reflows the rows.
 * Its arguments are the tiles shown; passing them makes it measure again once they change.
 */
export function pairCuts(...shown: readonly unknown[]): (strip: HTMLElement) => () => void {
  // Only the template's passing of the tiles matters: it makes Svelte re-create the attachment.
  void shown;
  return (strip) => {
    const observer = new ResizeObserver(() => markPairCuts(strip));
    observer.observe(strip);
    markPairCuts(strip);
    return () => observer.disconnect();
  };
}
