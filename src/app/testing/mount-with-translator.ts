import { flushSync, mount, unmount, type Component } from "svelte";
import { translatorContext } from "../i18n/context";
import { createTranslator } from "../i18n/translator";

/** Mounts `component` in German into a fresh element; returns the element and an unmount. */
export function mountWithTranslator<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
): { target: HTMLElement; destroy: () => void } {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(component, {
    target,
    props,
    context: translatorContext(createTranslator("de")),
  });
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
