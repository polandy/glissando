const STEP_KEYS: Readonly<Record<string, number>> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/**
 * The option a radio group's key moves to (WAI-ARIA radio group: arrows wrap around, Home and
 * End jump to the ends), or null for a key the group leaves to the browser.
 */
export function radioIndexForKey(key: string, current: number, count: number): number | null {
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return count - 1;
  }
  const step = STEP_KEYS[key];
  return step === undefined ? null : (current + step + count) % count;
}
