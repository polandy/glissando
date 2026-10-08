import { flushSync, mount, unmount, type Component } from "svelte";
import { translatorContext, type TranslatorSource } from "../i18n/context";
import { createTranslator } from "../i18n/translator";

/**
 * Mounts `component` into a fresh element, in German unless `translator` says otherwise;
 * returns the element and an unmount.
 */
export function mountWithTranslator<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
  translator: TranslatorSource = { current: createTranslator("de") },
): { target: HTMLElement; destroy: () => void } {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(component, { target, props, context: translatorContext(translator) });
  flushSync();
  let mounted = true;
  return {
    target,
    destroy: () => {
      if (mounted) {
        mounted = false;
        void unmount(instance);
        target.remove();
      }
    },
  };
}
