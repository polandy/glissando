/**
 * Resolves with the first element matching `selector` in `target`, once it is rendered and
 * `matches` it, such as once it shows a given text.
 */
export function whenRendered(
  target: HTMLElement,
  selector: string,
  matches: (element: Element) => boolean = () => true,
): Promise<Element> {
  return new Promise((resolve) => {
    const found = () => {
      const element = target.querySelector(selector);
      return element !== null && matches(element) ? element : null;
    };
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
