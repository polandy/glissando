import { afterEach, describe, expect, it, onTestFailed } from "vitest";
import { commands, page } from "vitest/browser";
import {
  drawnJpeg,
  keptInView,
  loaded,
  stateReached,
  watchPage,
} from "../export-player/testing/page-frame";
import { encodeBase64 } from "../html-export/base64";
import { PAGE_STATE_ATTRIBUTE, type PageState } from "../html-export/page-contract";
import { silentWav } from "../import/testing/silent-wav";
import sharePage from "virtual:glissando-share-page";
import type { FakeMedium, FakeShareApi } from "./testing/fake-share-api";

/** The shortest a picture may show (`checkOwnDurationMs`). */
const SLIDE_MS = 2000;
const MUSIC_MS = 1500;
/**
 * These tests play a real slideshow through real timers rather than a mocked clock; a full
 * playthrough already takes several seconds, and a loaded CI runner can push that past the
 * default test timeout.
 */
const TIMEOUT_MS = 30_000;
const PICTURE_SIZES = [
  [1600, 900],
  [800, 600],
  [900, 1600],
] as const;

async function medium(blob: Blob): Promise<FakeMedium> {
  return { base64: encodeBase64(new Uint8Array(await blob.arrayBuffer())), type: blob.type };
}

/**
 * A generated slideshow with one song, as the share API answers it: three pictures at revision 1
 * unless told otherwise.
 */
async function sharedSlideshow(
  token: string,
  {
    revision = 1,
    pictureCount = PICTURE_SIZES.length,
  }: { revision?: number; pictureCount?: number } = {},
): Promise<FakeShareApi> {
  const sizes = PICTURE_SIZES.slice(0, pictureCount);
  return {
    token,
    sharePage,
    mode: "shared",
    answer: {
      revision,
      slideshow: {
        title: "Generated <test>",
        createdAt: "2026-07-02T10:00:00Z",
        secondsPerPicture: 3,
        transition: "cut",
        pictures: sizes.map(([width, height]) => ({
          capturedAt: "2026-07-01T00:00:00Z",
          width,
          height,
          durationMs: SLIDE_MS,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        })),
        songs: [{ durationMs: MUSIC_MS, mimeType: "audio/wav" }],
      },
      beats: [null],
    },
    pictures: await Promise.all(
      sizes.map(async ([width, height], index) =>
        medium(await drawnJpeg(width, height, index * 90)),
      ),
    ),
    songs: [await medium(new Blob([silentWav(MUSIC_MS)], { type: "audio/wav" }))],
  };
}

/** Resolves once `element` is no longer hidden. */
function shown(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (element.hidden) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(element, { attributes: true, attributeFilter: ["hidden"] });
  });
}

/** The text of the notice card the page shows; null when it shows none. */
function shownNotice(shareDocument: Document): string | null {
  const notices = [...shareDocument.querySelectorAll<HTMLElement>(".notice")];
  return notices.find((notice) => !notice.hidden)?.textContent ?? null;
}

describe("the share page", () => {
  const cleanups: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    // Last in, first out: a watch keeps its report before its frame is removed.
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  });

  /** Serves `fake` and opens its link in a frame, kept in view so its clock runs. */
  async function opened(fake: FakeShareApi) {
    const seen: PageState[] = [];
    await commands.serveFakeShareApi(fake);
    cleanups.push(() => commands.stopFakeShareApi(fake.token));
    const frame = document.createElement("iframe");
    // Small enough to fit the test viewport wholly, as `keptInView` keeps it; tall enough for
    // the notice cards.
    Object.assign(frame.style, { width: "400px", height: "320px", border: "0" });
    cleanups.push(() => frame.remove());
    const first = loaded(frame);
    frame.src = `/s/${fake.token}`;
    document.body.append(frame);
    cleanups.push(keptInView(frame));
    const shareDocument = await first;
    const watch = watchPage(frame);
    cleanups.push(() => watch.stop());
    // A timeout alone says nothing; the report names where the page stopped.
    onTestFailed(() => {
      console.error(`the share page stopped: ${JSON.stringify({ seen, ...watch.report() })}`);
    });
    return { frame, shareDocument, seen };
  }

  it(
    "plays the shared slideshow from the start card to the end card",
    { timeout: TIMEOUT_MS },
    async () => {
      const { frame, shareDocument, seen } = await opened(await sharedSlideshow("plays"));
      await stateReached(shareDocument, "start", seen);
      expect(shareDocument.title).toBe("Generated <test>");
      expect(shareDocument.querySelector(".summary")?.textContent).toBe(
        "3 pictures · 0:06 · with music",
      );

      // Watched from before the click, which takes a round trip: no state may pass unseen.
      const ended = stateReached(shareDocument, "ended", seen);
      await page
        .frameLocator(page.elementLocator(frame))
        .getByRole("button", { name: "Play" })
        .click();
      await ended;

      expect(seen.filter((state) => state !== "loading")).toEqual([
        "start",
        "starting",
        "playing",
        "ended",
      ]);
      expect(shareDocument.querySelector(".end")?.textContent).toContain("Play again");
    },
  );

  it(
    "shows the Loading chip while a late picture holds the show, then plays on",
    { timeout: TIMEOUT_MS },
    async () => {
      const fake = { ...(await sharedSlideshow("late")), heldPicture: 2 };
      const { frame, shareDocument, seen } = await opened(fake);
      await stateReached(shareDocument, "start", seen);
      const chip = shareDocument.querySelector<HTMLElement>(".late");
      if (chip === null) throw new Error("the share page has no Loading chip");
      expect(chip.hidden).toBe(true);
      const chipShown = shown(chip);

      await page
        .frameLocator(page.elementLocator(frame))
        .getByRole("button", { name: "Play" })
        .click();
      await chipShown;
      expect(shareDocument.documentElement.getAttribute(PAGE_STATE_ATTRIBUTE)).toBe("playing");
      expect(chip.textContent).toBe("Loading");
      const ended = stateReached(shareDocument, "ended", seen);
      await commands.releaseFakeSharePicture(fake.token);
      await ended;

      expect(chip.hidden).toBe(true);
    },
  );

  it(
    "skips a picture the server no longer has and plays the others to the end",
    { timeout: TIMEOUT_MS },
    async () => {
      const fake = { ...(await sharedSlideshow("skips")), missingPicture: 1 };
      const { frame, shareDocument, seen } = await opened(fake);
      await stateReached(shareDocument, "start", seen);

      const ended = stateReached(shareDocument, "ended", seen);
      await page
        .frameLocator(page.elementLocator(frame))
        .getByRole("button", { name: "Play" })
        .click();
      await ended;

      expect(shareDocument.querySelector(".end")?.textContent).toContain("Play again");
      expect(shareDocument.querySelector(".time")?.textContent).toBe("0:04 / 0:04");
    },
  );

  it(
    "plays the slideshow as it is now on Play again: a new revision with fewer pictures",
    { timeout: TIMEOUT_MS },
    async () => {
      const { frame, shareDocument, seen } = await opened(await sharedSlideshow("live"));
      await stateReached(shareDocument, "start", seen);
      const player = page.frameLocator(page.elementLocator(frame));
      const firstEnd = stateReached(shareDocument, "ended", seen);
      await player.getByRole("button", { name: "Play" }).click();
      await firstEnd;
      expect(shareDocument.querySelector(".time")?.textContent).toBe("0:06 / 0:06");

      await commands.serveFakeShareApi(
        await sharedSlideshow("live", { revision: 2, pictureCount: 2 }),
      );
      seen.length = 0;
      // The page still shows `ended`: the second end is only watched for once it started again.
      const restarted = stateReached(shareDocument, "starting", seen);
      await player.getByRole("button", { name: "Play again" }).click();
      await restarted;
      await stateReached(shareDocument, "ended", seen);

      expect(seen).toEqual(["ended", "starting", "playing", "ended"]);
      expect(shareDocument.querySelector(".time")?.textContent).toBe("0:04 / 0:04");
    },
  );

  it(
    "shows the gone card when a picture says the link was turned off while it plays",
    { timeout: TIMEOUT_MS },
    async () => {
      const fake = { ...(await sharedSlideshow("gone-picture")), gonePicture: 1 };
      const { frame, shareDocument, seen } = await opened(fake);
      await stateReached(shareDocument, "start", seen);

      const gone = stateReached(shareDocument, "gone", seen);
      await page
        .frameLocator(page.elementLocator(frame))
        .getByRole("button", { name: "Play" })
        .click();
      await gone;

      expect(seen).toContain("playing");
      expect(shownNotice(shareDocument)).toContain("This link doesn't work any more");
    },
  );

  it(
    "shows the gone card when Play again finds the songs turned off",
    { timeout: TIMEOUT_MS },
    async () => {
      const { frame, shareDocument, seen } = await opened(await sharedSlideshow("gone-song"));
      await stateReached(shareDocument, "start", seen);
      const player = page.frameLocator(page.elementLocator(frame));
      const ended = stateReached(shareDocument, "ended", seen);
      await player.getByRole("button", { name: "Play" }).click();
      await ended;

      await commands.serveFakeShareApi({
        ...(await sharedSlideshow("gone-song", { revision: 2 })),
        goneSongs: true,
      });
      const gone = stateReached(shareDocument, "gone", seen);
      await player.getByRole("button", { name: "Play again" }).click();
      await gone;

      expect(shownNotice(shareDocument)).toContain("This link doesn't work any more");
    },
  );

  it("says the link no longer works, without the slideshow's title, once it is turned off", async () => {
    const fake = { ...(await sharedSlideshow("gone")), mode: "gone" } as const;
    const { shareDocument, seen } = await opened(fake);

    await stateReached(shareDocument, "gone", seen);

    expect(shareDocument.body.textContent).toContain("This link doesn't work any more");
    expect(shareDocument.body.textContent).not.toContain("Generated <test>");
  });

  it("offers to try again while the server isn't answering, and then plays", async () => {
    const shared = await sharedSlideshow("unreachable");
    const { frame, shareDocument, seen } = await opened({ ...shared, mode: "unreachable" });
    await stateReached(shareDocument, "unreachable", seen);
    expect(shareDocument.body.textContent).toContain("Can't reach the slideshow right now");

    await commands.serveFakeShareApi(shared);
    const reloaded = loaded(frame);
    await page
      .frameLocator(page.elementLocator(frame))
      .getByRole("button", { name: "Try again" })
      .click();
    const again = await reloaded;
    await stateReached(again, "start", seen);

    expect(again.querySelector(".start .title")?.textContent).toBe("Generated <test>");
  });
});
