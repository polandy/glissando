import "../../styles/tokens.css";
import "../../styles/base.css";
import { flushSync } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { button, element, mountEditor, unmountEditor } from "./picture-editor-harness";
import { tile } from "./picture-editor-timing-fixtures";

/** The reference phone, a Pixel 9 Pro, in CSS pixels. */
const PHONE = { width: 412, height: 915 };
const DESKTOP = { width: 1280, height: 900 };

afterEach(async () => {
  unmountEditor();
  await page.viewport(DESKTOP.width, DESKTOP.height);
});

const well = () => element(".well");
const preview = () => element(".preview");
const shown = (target: Element) => target.checkVisibility();
const viewSwitch = (name: string) =>
  [...document.querySelectorAll<HTMLButtonElement>(".view-switch button")].find(
    (candidate) => shown(candidate) && candidate.textContent?.trim() === name,
  );
const pressed = (name: string) => viewSwitch(name)?.getAttribute("aria-pressed");
const toggle = (key: "from" | "to") => element<HTMLButtonElement>(`.keys [data-key="${key}"]`);

function click(target: HTMLElement | undefined): void {
  if (target === undefined) {
    throw new Error("nothing to click");
  }
  target.click();
  flushSync();
}

async function onPhone(): Promise<ReturnType<typeof mountEditor>> {
  await page.viewport(PHONE.width, PHONE.height);
  return mountEditor();
}

describe("PictureEditorScreen on a phone: one view at a time", () => {
  it("opens on the frames alone, with Frame pressed in the Frame | Play switch", async () => {
    await onPhone();

    expect(shown(well())).toBe(true);
    expect(pressed("Rahmen")).toBe("true");
    expect(pressed("Abspielen")).toBe("false");
    expect(shown(preview())).toBe(false);
  });

  it("shows the preview alone on Play, playing from the start, and the frames again on Frame", async () => {
    const { advance } = await onPhone();
    advance(2000);

    click(viewSwitch("Abspielen"));
    expect(shown(preview())).toBe(true);
    expect(pressed("Abspielen")).toBe("true");
    expect(shown(well())).toBe(false);
    expect(element(".preview-time").textContent).toBe("0:00,0 / 0:05,0");

    click(viewSwitch("Rahmen"));
    expect(shown(well())).toBe(true);
    expect(shown(preview())).toBe(false);
  });

  it("goes back to the frames when Start or End is picked", async () => {
    await onPhone();
    click(viewSwitch("Abspielen"));

    click(toggle("to"));

    expect(shown(well())).toBe(true);
    expect(element(".frame.active").dataset["key"]).toBe("to");
    expect(pressed("Rahmen")).toBe("true");
  });

  it.each([
    ["Swap start and end", () => button("Start und Ende tauschen")],
    ["a longer duration", () => button("Eine halbe Sekunde länger")],
    ["a transition", () => tile("push-left")],
  ])("shows the preview after %s", async (_, control) => {
    await onPhone();
    expect(shown(well())).toBe(true);

    click(control());

    expect(shown(preview())).toBe(true);
    expect(shown(well())).toBe(false);
    expect(pressed("Abspielen")).toBe("true");
  });
});

describe("PictureEditorScreen frames", () => {
  it("keeps the frames and the preview side by side on a desktop, without a switch", () => {
    mountEditor();

    expect(shown(well())).toBe(true);
    expect(shown(preview())).toBe(true);
    expect(viewSwitch("Rahmen")).toBeUndefined();
  });

  it.each([
    ["a phone", PHONE],
    ["a desktop", DESKTOP],
  ])("names Start and End without a zoom readout on %s", async (_, size) => {
    await page.viewport(size.width, size.height);
    mountEditor();

    expect(toggle("from").textContent?.trim()).toBe("Start");
    expect(toggle("to").textContent?.trim()).toBe("Ende");
  });
});
