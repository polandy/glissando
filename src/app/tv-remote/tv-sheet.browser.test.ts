import { flushSync, tick } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { CODE, SECRET, harness } from "./tv-session-fixtures";
import TvControl from "./TvControl.svelte";

let destroy: (() => void) | null = null;
afterEach(() => {
  destroy?.();
  destroy = null;
});

async function mountControl({ prefilled = null as string | null } = {}) {
  const parts = harness({ openedFrom: "hike" });
  if (prefilled !== null) parts.session.open(prefilled);
  const mounted = mountWithTranslator(TvControl, {
    session: parts.session,
    withRow: prefilled === null,
  });
  destroy = mounted.destroy;
  const { target } = mounted;

  async function settle(): Promise<void> {
    await parts.api.settled();
    flushSync();
    await tick();
  }
  await settle();
  const dialog = () => target.querySelector("dialog");
  const boxes = () => [...target.querySelectorAll<HTMLInputElement>(".code input")];
  const button = (text: string): HTMLButtonElement => {
    const found = [...target.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === text,
    );
    if (found === undefined) throw new Error(`no button "${text}" in ${target.innerText}`);
    return found;
  };
  const click = async (text: string) => {
    button(text).click();
    await settle();
  };
  const row = () => target.querySelector<HTMLElement>(".tv-row");
  const openSheet = async () => {
    row()?.click();
    await settle();
  };
  /** Puts `text` into a box as typing or pasting does. */
  const enter = async (index: number, text: string) => {
    const box = boxes()[index];
    if (box === undefined) throw new Error(`no box ${String(index)}`);
    box.value = text;
    box.dispatchEvent(new InputEvent("input", { bubbles: true }));
    await settle();
  };
  return { ...parts, target, dialog, boxes, button, click, row, openSheet, enter };
}

describe("The Show on TV row and sheet (tv_remote/IN_THE_APP.md)", () => {
  it("offers Show on TV in the row, opening the code step with the TV's address", async () => {
    const { row, openSheet, dialog, boxes } = await mountControl();

    expect(row()?.textContent).toContain("Auf dem Fernseher zeigen");
    await openSheet();

    expect(dialog()?.textContent).toContain("Öffne photos.example.org/tv im Browser");
    expect(boxes()).toHaveLength(4);
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it("fills the boxes letter by letter, upper-cased, and Verbinden waits for four", async () => {
    const { openSheet, enter, boxes, button, dialog } = await mountControl();
    await openSheet();

    await enter(0, "k");
    await enter(1, "1");
    expect(boxes().map((box) => box.value)).toEqual(["K", "", "", ""]);
    await enter(1, "x");
    await enter(2, "q");

    expect(boxes().map((box) => box.value)).toEqual(["K", "X", "Q", ""]);
    expect(document.activeElement).toBe(boxes()[3]);
    expect(dialog()?.textContent).toContain("3 von 4 Buchstaben");
    expect(button("Verbinden").disabled).toBe(true);
    await enter(3, "m");
    expect(button("Verbinden").disabled).toBe(false);
  });

  it("fills all four boxes from a pasted code", async () => {
    const { openSheet, enter, boxes } = await mountControl();
    await openSheet();

    await enter(0, "kx-qm");

    expect(boxes().map((box) => box.value)).toEqual(["K", "X", "Q", "M"]);
  });

  it("says a code matches no TV, and Neu eingeben empties the boxes", async () => {
    const { openSheet, enter, click, dialog, boxes } = await mountControl();
    await openSheet();
    await enter(0, "ABCD");

    await click("Verbinden");
    expect(dialog()?.textContent).toContain("Dieser Code passt zu keinem Fernseher");
    await click("Neu eingeben");

    expect(boxes().map((box) => box.value)).toEqual(["", "", "", ""]);
  });

  it("offers the slideshows after connecting, then shows the chosen one on the TV", async () => {
    const { openSheet, enter, click, dialog, opened, api } = await mountControl();
    await openSheet();
    await enter(0, CODE);

    await click("Verbinden");
    expect(dialog()?.querySelector(".pill")?.textContent).toBe(`Mit Fernseher ${CODE} verbunden`);
    const pressed = dialog()?.querySelector('.card[aria-pressed="true"]');
    expect(pressed?.textContent).toContain("Mountain hike");
    expect(pressed?.textContent).toContain("96 Bilder · 6:40");
    [...(dialog()?.querySelectorAll<HTMLElement>(".card") ?? [])][0]?.click();
    await click("Auf dem Fernseher zeigen");

    expect(api.shown).toEqual([{ remoteSecret: SECRET, slideshowId: "july" }]);
    expect(opened).toEqual([`/r/${SECRET}`]);
  });

  it("opens connected at once from the TV's QR code, without a row", async () => {
    const { dialog, row, button } = await mountControl({ prefilled: CODE });

    expect(button("Trennen")).toBeTruthy();
    expect(dialog()?.textContent).toContain("Welche Diashow soll der Fernseher zeigen?");
    expect(row()).toBeNull();
  });

  it("shows the server's error with Erneut versuchen, which connects", async () => {
    const { openSheet, enter, click, dialog, api } = await mountControl();
    await openSheet();
    await enter(0, CODE);
    api.down = true;

    await click("Verbinden");
    expect(dialog()?.querySelector('[role="alert"]')?.textContent).toContain(
      "Dein Glissando-Server antwortet nicht.",
    );
    api.down = false;
    await click("Erneut versuchen");

    expect(dialog()?.querySelector('[role="alert"]')).toBeNull();
    expect(dialog()?.textContent).toContain("Welche Diashow soll der Fernseher zeigen?");
  });

  it("disconnects on Trennen and gives focus back to the row", async () => {
    const { openSheet, enter, click, dialog, row, api } = await mountControl();
    await openSheet();
    await enter(0, CODE);
    await click("Verbinden");

    await click("Trennen");

    expect(api.disconnected).toEqual([SECRET]);
    expect(row()).not.toBeNull();
    expect(dialog()).toBeNull();
    await tick();
    expect(document.activeElement).toBe(row());
  });
});
