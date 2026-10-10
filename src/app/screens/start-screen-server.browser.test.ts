import { createRawSnippet } from "svelte";
import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import StartScreen from "./StartScreen.svelte";
import type { ServerShelf, SlideshowSummary } from "./view-models";

// A transparent pixel stands in for the covers.
const PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const summary = (id: string, title: string, coverUrls = [PIXEL]): SlideshowSummary => ({
  id,
  title,
  coverUrls,
  pictureCount: 40,
  durationSeconds: 200,
  hasMusic: false,
});

let destroy = () => {};
afterEach(() => destroy());

function mountStart(
  server: ServerShelf | null,
  slideshows = [summary("lake", "Summer by the lake")],
  language: "de" | "en" = "en",
) {
  const opened: string[] = [];
  const created: true[] = [];
  const mounted = mountWithTranslator(
    StartScreen,
    {
      slideshows,
      server,
      focusSearches: new Map(),
      onCreate: () => created.push(true),
      onOpen: (slideshowId: string) => opened.push(slideshowId),
      onSettings: () => {},
      onOpenFile: () => {},
      notice: null,
      onDismissNotice: () => {},
      onReload: () => {},
      statusBar: createRawSnippet(() => ({ render: () => "<footer></footer>" })),
    },
    { current: createTranslator(language) },
  );
  destroy = mounted.destroy;
  return { target: mounted.target, opened, created };
}

const headings = (target: HTMLElement) =>
  [...target.querySelectorAll("h1, h2")].map((heading) => heading.textContent.trim());

const serverSection = (target: HTMLElement): HTMLElement => {
  const section = target.querySelector<HTMLElement>('section[aria-labelledby="server-shelf"]');
  if (section === null) throw new Error("no server section");
  return section;
};

const cardOf = (within: HTMLElement, title: string): HTMLButtonElement => {
  const found = [...within.querySelectorAll<HTMLButtonElement>("button.show")].find((button) =>
    button.textContent.includes(title),
  );
  if (found === undefined) throw new Error(`no card for "${title}"`);
  return found;
};

describe("StartScreen, slideshows on the Glissando server", () => {
  it("shows one library as before while the server library is off", () => {
    const { target } = mountStart(null);

    expect(headings(target)).toEqual(["Your slideshows"]);
    expect(target.textContent).not.toContain("Glissando server");
  });

  it("splits the library into this device's and the server's slideshows when it is on", () => {
    const { target, opened } = mountStart({
      offline: false,
      slideshows: [summary("iceland", "Iceland 2025")],
    });

    expect(headings(target)).toEqual(["On this device", "On your Glissando server"]);
    const server = serverSection(target);
    expect(server.textContent).toContain(
      "Pictures stay in Immich. Shared by everyone who opens this Glissando.",
    );
    const iceland = cardOf(server, "Iceland 2025");
    expect(iceland.querySelector(".chip")?.textContent.trim()).toBe("Server");
    iceland.click();
    expect(opened).toEqual(["iceland"]);
  });

  it("ends the server's grid with the dashed new-slideshow card", () => {
    const { target, created } = mountStart({ offline: false, slideshows: [] });

    const server = serverSection(target);
    const items = server.querySelectorAll(".grid > li");
    expect(items).toHaveLength(1);
    items[0]?.querySelector<HTMLButtonElement>("button.new")?.click();
    expect(created).toEqual([true]);
  });

  it.each([
    { language: "en", line: "Nothing on this device yet." },
    { language: "de", line: "Noch nichts auf diesem Gerät." },
  ] as const)(
    "says in $language that nothing is on this device yet when only the server has slideshows",
    ({ language, line }) => {
      const { target } = mountStart(
        { offline: false, slideshows: [summary("iceland", "Iceland 2025")] },
        [],
        language,
      );

      expect(cardOf(serverSection(target), "Iceland 2025")).toBeDefined();
      expect(target.querySelector(".head + .empty")?.textContent.trim()).toBe(line);
    },
  );

  it("greys offline server cards out, says they need the server and does not open them", () => {
    const { target, opened } = mountStart({
      offline: true,
      slideshows: [summary("iceland", "Iceland 2025", [])],
    });

    const server = serverSection(target);
    expect(server.textContent).toContain(
      "Offline. Server slideshows play again once this device reaches your Glissando server.",
    );
    const iceland = cardOf(server, "Iceland 2025");
    expect(iceland.textContent).toContain("Needs your Glissando server");
    expect(iceland.getAttribute("aria-disabled")).toBe("true");
    iceland.click();
    expect(opened).toEqual([]);
  });
});
