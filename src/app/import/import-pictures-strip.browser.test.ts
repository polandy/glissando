import { flushSync } from "svelte";
import { describe, expect, it } from "vitest";
import {
  arrangementWith,
  mountStrip,
  nameOf,
  press,
  text,
  tiles,
} from "../testing/import-pictures-strip-fixtures";

describe("ImportPicturesStrip, placeholders", () => {
  it("shimmers a placeholder for a picture without a thumbnail yet and for each pending file, only the first running", () => {
    const { target } = mountStrip({ ids: ["a", "b", "c"], withoutUrl: ["c"], pending: 2 });

    const placeholders = [...target.querySelectorAll(".strip .placeholder")];
    expect(placeholders).toHaveLength(3);
    expect(placeholders.map((placeholder) => placeholder.getAttribute("aria-hidden"))).toEqual([
      "true",
      "true",
      "true",
    ]);
    expect(placeholders.map((placeholder) => placeholder.querySelector(".bar") !== null)).toEqual([
      true,
      false,
      false,
    ]);
    // Never a tab stop: no button and no tabindex of its own.
    for (const placeholder of placeholders) {
      expect(placeholder.querySelector("button")).toBeNull();
    }
  });
});

describe("ImportPicturesStrip, viewing and removing", () => {
  it("opens the focused tile with F", () => {
    const { target, viewed } = mountStrip({ ids: ["a", "b"] });

    tiles(target)[1]?.focus();
    press("f");

    expect(viewed).toEqual(["b"]);
  });

  it("removes the focused tile with Delete", () => {
    const { target, removed } = mountStrip({ ids: ["a", "b"] });

    tiles(target)[0]?.focus();
    press("Delete");

    expect(removed).toEqual(["a"]);
  });
});

describe("ImportPicturesStrip, the selection bar", () => {
  it("while adding, without arranging, offers only View and Remove, no Earlier or Later", () => {
    const { target } = mountStrip({ ids: ["a", "b"], arrangement: null });

    tiles(target)[0]?.click();
    flushSync();

    const bar = target.querySelector('[role="toolbar"]');
    expect(bar).not.toBeNull();
    const labels = [...(bar?.querySelectorAll("button") ?? [])].map((button) => text(button));
    expect(labels).toEqual(["Ansehen", "Entfernen", "Fertig"]);
  });

  it("while arranging a new slideshow, also offers Earlier and Later", () => {
    const arrangement = arrangementWith(["a", "b", "c"]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });

    tiles(target)[1]?.click();
    flushSync();

    const bar = target.querySelector('[role="toolbar"]');
    const labels = [...(bar?.querySelectorAll("button") ?? [])].map(nameOf);
    expect(labels).toEqual(["Früher", "Später", "Ansehen", "Entfernen", "Fertig"]);
  });

  it("shows Earlier and Later as icons named by their words, which are also their tooltips", () => {
    const arrangement = arrangementWith(["a", "b", "c"]);
    const { target } = mountStrip({ ids: ["a", "b", "c"], arrangement });

    tiles(target)[1]?.click();
    flushSync();

    const bar = target.querySelector('[role="toolbar"]');
    for (const name of ["Früher", "Später"]) {
      const move = bar?.querySelector(`button[aria-label="${name}"]`);
      expect(move?.querySelector("svg")).not.toBeNull();
      expect(move?.getAttribute("title")).toBe(name);
      expect(text(move)).toBe("");
    }
  });
});

describe("ImportPicturesStrip, adding more", () => {
  it("offers the add menu from the strip head", () => {
    const { target } = mountStrip({ ids: ["a", "b"] });

    const headButton = target.querySelector('.strip-head button[aria-haspopup="menu"]');
    expect(headButton).not.toBeNull();

    headButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    expect(target.querySelector('[role="menu"]')).not.toBeNull();
  });

  it("has no add tile after the placeholders; the head button is the only way in", () => {
    const { target } = mountStrip({ ids: ["a", "b"], pending: 1 });

    expect(target.querySelector('.strip-head button[aria-haspopup="menu"]')).not.toBeNull();
    expect(target.querySelector("li.tile button.add-tile")).toBeNull();
  });

  it("offers only From Immich while linking a server slideshow", () => {
    const opened: boolean[] = [];
    const { target } = mountStrip({
      ids: ["a"],
      onAddMore: null,
      onOpenImmich: () => opened.push(true),
    });

    const headButton = target.querySelector('.strip-head button[aria-haspopup="menu"]');
    expect(headButton).not.toBeNull();
    headButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    flushSync();

    const items = [...target.querySelectorAll('[role="menuitem"]')].map((item) => text(item));
    expect(items).toEqual(["Aus Immich"]);
  });

  it("shows no add button and no add tile with neither on offer", () => {
    const { target } = mountStrip({ ids: ["a"], onAddMore: null, onOpenImmich: null });

    expect(target.querySelector('.strip-head button[aria-haspopup="menu"]')).toBeNull();
    expect(target.querySelector("li.tile button.add-tile")).toBeNull();
  });
});
