/** Resolves with the first element matching `selector` in `target`, once it is rendered. */
export function whenRendered(target: HTMLElement, selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const found = () => target.querySelector(selector);
    const observer = new MutationObserver(() => {
      const element = found();
      if (element !== null) {
        observer.disconnect();
        resolve(element);
      }
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    const already = found();
    if (already !== null) {
      observer.disconnect();
      resolve(already);
    }
  });
}
