import { afterEach, describe, expect, it } from "vitest";
import { buttonNamed, findButtonNamed } from "./by-role";

afterEach(() => {
  document.body.replaceChildren();
});

function mount(...buttons: readonly (readonly [text: string, label?: string])[]): HTMLElement {
  const root = document.createElement("div");
  for (const [text, label] of buttons) {
    const button = document.createElement("button");
    button.textContent = text;
    if (label !== undefined) {
      button.setAttribute("aria-label", label);
    }
    root.append(button);
  }
  document.body.append(root);
  return root;
}

describe("buttonNamed", () => {
  it("finds a button by its text, ignoring surrounding and inner whitespace", () => {
    const root = mount(["  Ab\n   hier "], ["Other"]);

    expect(buttonNamed(root, "Ab hier").textContent).toContain("Ab");
  });

  it("finds an icon button by its aria-label", () => {
    const root = mount(["×", "Schließen"]);

    expect(buttonNamed(root, "Schließen").textContent).toBe("×");
  });

  it("matches the whole name, not a part of it", () => {
    const root = mount(["Abspielen starten"]);

    expect(findButtonNamed(root, "Abspielen")).toBeUndefined();
  });

  it("throws naming the button when it is missing", () => {
    const root = mount(["Other"]);

    expect(() => buttonNamed(root, "Missing")).toThrow('no button named "Missing"');
  });
});
