const collapse = (text: string | null): string => (text ?? "").replace(/\s+/g, " ").trim();

/** The button in `root` whose `aria-label` or whitespace-collapsed text is exactly `name`. */
export function findButtonNamed(root: ParentNode, name: string): HTMLButtonElement | undefined {
  return [...root.querySelectorAll("button")].find(
    (candidate) =>
      candidate.getAttribute("aria-label") === name || collapse(candidate.textContent) === name,
  );
}

/** Like `findButtonNamed`, but fails the test loudly when the button is missing. */
export function buttonNamed(root: ParentNode, name: string): HTMLButtonElement {
  const found = findButtonNamed(root, name);
  if (found === undefined) {
    throw new Error(`no button named "${name}"`);
  }
  return found;
}
