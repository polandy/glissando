import { afterEach, describe, expect, it } from "vitest";
import { Navigator, type Route } from "../navigation/navigator";
import { FakeHistory } from "../testing/fake-history";
import { mountWithTranslator } from "../testing/mount-with-translator";
import Header from "./Header.svelte";
import type { Crumb } from "./crumbs";

let destroy = () => {};
afterEach(() => destroy());

const START: Route = { screen: "start" };
const SHOW: Route = { screen: "slideshow", slideshowId: "s1" };
const PICTURE: Route = { screen: "picture", slideshowId: "s1", pictureId: "p2" };

function onPicture(crumbs: readonly Crumb[]) {
  const history = new FakeHistory();
  const navigator = new Navigator(history);
  navigator.open(SHOW);
  navigator.open(PICTURE);
  const mounted = mountWithTranslator(Header, { crumbs }, undefined, navigator);
  destroy = mounted.destroy;
  const buttons = () => [...mounted.target.querySelectorAll<HTMLButtonElement>(".crumb-link")];
  const click = (label: string) => {
    const found = buttons().find((button) => button.textContent?.trim() === label);
    if (found === undefined) {
      throw new Error(`no crumb link "${label}"`);
    }
    found.click();
    history.deliverPop();
  };
  return { navigator, buttons, click };
}

describe("Header crumbs as links", () => {
  const crumbs = ["Bibliothek", "Sommer am See", "Bild 2"];

  it("links every crumb before the current one", () => {
    const { buttons } = onPicture(crumbs);

    expect(buttons().map((button) => button.textContent?.trim())).toEqual([
      "Bibliothek",
      "Sommer am See",
    ]);
  });

  it("takes the first crumb to the start screen", () => {
    const { navigator, click } = onPicture(crumbs);

    click("Bibliothek");

    expect(navigator.route).toEqual(START);
  });

  it("takes a middle crumb to its screen", () => {
    const { navigator, click } = onPicture(crumbs);

    click("Sommer am See");

    expect(navigator.route).toEqual(SHOW);
  });

  it("keeps a label that is no screen as text beside a link", () => {
    const { buttons } = onPicture([
      "Bibliothek",
      { label: "Neue Diashow", isScreen: false },
      "Bild 2",
    ]);

    expect(buttons().map((button) => button.textContent?.trim())).toEqual(["Bibliothek"]);
  });

  it("links nothing when there is only the current crumb", () => {
    const { buttons } = onPicture(["Bild 2"]);

    expect(buttons()).toEqual([]);
  });
});
