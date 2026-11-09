import { flushSync, mount, unmount, type Component } from "svelte";
import { appContext } from "../app-context";
import type { TranslatorSource } from "../i18n/context";
import { createTranslator } from "../i18n/translator";
import type { NavigatorSource } from "../navigation/context";
import { Navigator } from "../navigation/navigator";
import { FakeHistory } from "./fake-history";

/**
 * Mounts `component` into a fresh element, in German unless `translator` says otherwise, with a
 * navigator over a fake history unless `navigator` is given; returns the element and an unmount.
 */
export function mountWithTranslator<Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: Props,
  translator: TranslatorSource = { current: createTranslator("de") },
  navigator: NavigatorSource = new Navigator(new FakeHistory()),
): { target: HTMLElement; destroy: () => void } {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = mount(component, {
    target,
    props,
    context: appContext(translator, navigator),
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
