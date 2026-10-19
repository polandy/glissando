import { afterEach, describe, expect, it } from "vitest";
import { commands, page } from "vitest/browser";
import { loaded, stateReached } from "../export-player/testing/page-frame";
import type { FakeShareApi } from "./testing/fake-share-api";
import {
  openedShare,
  sharedSlideshow,
  shownNotice,
  TIMEOUT_MS,
} from "./testing/share-page-fixture";

describe("the share page, once the link is gone or the server is unreachable", () => {
  const cleanups: (() => Promise<void> | void)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
  });
  const opened = (fake: FakeShareApi) => openedShare(fake, cleanups);

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
