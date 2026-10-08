import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { MAX_SECONDS_PER_PICTURE, MIN_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
import { mountWithTranslator } from "../testing/mount-with-translator";
import Header from "./Header.svelte";
import SecondsStepper from "./SecondsStepper.svelte";
import Toast from "./Toast.svelte";

let destroy = () => {};
afterEach(() => destroy());

function button(target: HTMLElement, label: string): HTMLButtonElement {
  const found = target.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (found === null) {
    throw new Error(`no button labelled "${label}"`);
  }
  return found;
}

describe("Header", () => {
  it("shows the back arrow only with a back handler, and the last crumb as the current place", () => {
    let backs = 0;
    const mounted = mountWithTranslator(Header, {
      crumbs: ["Glissando", "Sommer am See"],
      onBack: () => (backs += 1),
    });
    destroy = mounted.destroy;

    button(mounted.target, "Zurück").click();

    expect(mounted.target.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Sommer am See",
    );
    expect(backs).toBe(1);
  });

  it("has no back arrow on the start screen", () => {
    const mounted = mountWithTranslator(Header, { crumbs: [] });
    destroy = mounted.destroy;

    expect(mounted.target.querySelector("nav")).not.toBeNull();
    expect(mounted.target.querySelector("button")).toBeNull();
  });
});

describe("SecondsStepper", () => {
  function mountStepper(seconds: number) {
    const changes: number[] = [];
    const mounted = mountWithTranslator(SecondsStepper, {
      seconds,
      onChange: (value: number) => changes.push(value),
    });
    destroy = mounted.destroy;
    return { ...mounted, changes };
  }

  it("shows the seconds in the locale and steps by half a second", () => {
    const { target, changes } = mountStepper(4.5);

    button(target, "Länger").click();
    button(target, "Kürzer").click();

    expect(target.textContent).toContain("4,5 s");
    expect(changes).toEqual([5, 4]);
  });

  it("disables shorter at the minimum", () => {
    const { target } = mountStepper(MIN_SECONDS_PER_PICTURE);

    expect(button(target, "Länger").disabled).toBe(false);
    expect(button(target, "Kürzer").disabled).toBe(true);
  });

  it("disables longer at the maximum", () => {
    const { target } = mountStepper(MAX_SECONDS_PER_PICTURE);

    expect(button(target, "Kürzer").disabled).toBe(false);
    expect(button(target, "Länger").disabled).toBe(true);
  });
});

describe("Toast", () => {
  it("offers the action and the ✕", () => {
    const calls: string[] = [];
    const mounted = mountWithTranslator(Toast, {
      toast: {
        text: "Musik konnte nicht gelesen werden",
        tone: "error",
        action: { label: "Erneut", run: () => {} },
      },
      onAction: () => calls.push("action"),
      onDismiss: () => calls.push("dismiss"),
    });
    destroy = mounted.destroy;

    mounted.target.querySelector<HTMLButtonElement>(".action")?.click();
    button(mounted.target, "Ausblenden").click();
    flushSync();

    expect(mounted.target.querySelector('[role="alert"]')?.textContent).toContain("Erneut");
    expect(calls).toEqual(["action", "dismiss"]);
  });
});
