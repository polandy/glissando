import "./tokens.css";
import "./base.css";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, server } from "vitest/browser";
import { emulateCoarsePointer, pointerIsCoarse } from "../app/testing/coarse-pointer";
import { touchTargetViolations } from "../app/testing/touch-target";

/** Firefox and WebKit cannot turn a coarse pointer on per test; Chromium can. */
const canEmulate = server.browser === "chromium";
const PHONE = { width: 390, height: 844 };

/** The nodes the markup describes; the markup is the test's own fixed text. */
const markup = (html: string) => document.createRange().createContextualFragment(html);

let host: HTMLElement;
beforeEach(async () => {
  await page.viewport(PHONE.width, PHONE.height);
  host = document.createElement("div");
  document.body.append(host);
});
afterEach(async () => {
  host.remove();
  if (canEmulate) await emulateCoarsePointer(false);
});

/** Controls in a row, as headers and steppers lay them out: a 12 px gap, which the pads of a 36 px and a 28 px control (4 + 8 px overhang) just fit. */
const ROW = `
  <div style="display:flex;gap:12px;padding:12px;align-items:center">
    <button class="btn">Weiter</button>
    <button class="btn primary">Speichern</button>
    <button class="btn small">Klein</button>
    <button class="btn large">Gross</button>
    <button class="icon-btn" aria-label="Zurück"><svg width="16" height="16"></svg></button>
    <button class="icon-btn small" aria-label="Schliessen"><svg width="12" height="12"></svg></button>
  </div>`;

describe.skipIf(!canEmulate)("shared controls under a coarse pointer", () => {
  it("emulation flips the media query", async () => {
    expect(pointerIsCoarse()).toBe(false);
    await emulateCoarsePointer(true);
    expect(pointerIsCoarse()).toBe(true);
  });

  it("gives every button a 44 px square of its own to tap", async () => {
    await emulateCoarsePointer(true);
    host.append(markup(ROW));

    expect(touchTargetViolations(host)).toEqual([]);
  });

  it("keeps the .btn and .icon-btn pads for a lone control too", async () => {
    await emulateCoarsePointer(true);
    host.append(
      markup(`<div style="padding:40px"><button class="btn small">A</button></div>
      <div style="padding:40px"><button class="icon-btn small" aria-label="B"></button></div>`),
    );

    expect(touchTargetViolations(host)).toEqual([]);
  });

  it("keeps a pad at the screen's edge from widening the page", async () => {
    await emulateCoarsePointer(true);
    host.id = "app";
    host.append(
      markup(`<div style="display:flex;justify-content:space-between;padding:6px">
        <button class="icon-btn small" aria-label="A"></button>
        <button class="icon-btn small" aria-label="B"></button></div>`),
    );
    const scroller = document.scrollingElement as Element;

    expect(host.querySelectorAll(".icon-btn")).toHaveLength(2);
    expect(scroller.scrollWidth).toBe(scroller.clientWidth);
  });
});

describe("shared controls under any pointer", () => {
  it("declares the coarse rule for the shared classes in base.css", () => {
    const rules = [...document.styleSheets].flatMap((sheet) =>
      [...sheet.cssRules].filter(
        (rule): rule is CSSMediaRule =>
          rule instanceof CSSMediaRule && rule.conditionText.includes("pointer: coarse"),
      ),
    );
    const text = rules.map((rule) => rule.cssText).join("\n");

    expect(text).toContain(".btn");
    expect(text).toContain(".icon-btn");
  });
});
