import { afterEach, describe, expect, it } from "vitest";
import { commands, page } from "vitest/browser";
import { stateReached } from "../export-player/testing/page-frame";
import { PAGE_STATE_ATTRIBUTE } from "../html-export/page-contract";
import type { FakeShareApi } from "./testing/fake-share-api";
import { openedShare, sharedSlideshow, shown, TIMEOUT_MS } from "./testing/share-page-fixture";

describe("the share page", () => {
  const cleanups: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  });
  const opened = (fake: FakeShareApi) => openedShare(fake, cleanups);

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
});
