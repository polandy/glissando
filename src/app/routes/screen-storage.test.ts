import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { ShareLinkSession, type ShareLinkState } from "../share-link/share-link-session";
import { FakeShareLinkApi } from "../share-link/testing/fake-share-link-api";
import { ScreenStorage } from "./screen-storage.svelte";
import type { SlideshowHome } from "./slideshow-storage";

function screenStorage(home: SlideshowHome) {
  const sessions: ShareLinkSession[] = [];
  const storage = new ScreenStorage({
    home,
    slideshowId: "show",
    newShareLinkSession: (slideshowId) => {
      const session = new ShareLinkSession(slideshowId, {
        api: new FakeShareLinkApi(slideshowId, null),
        origin: "https://photos.example.org",
        scheduler: new FakeScheduler(),
        clipboard: null,
        shareSheet: null,
        openTab: () => {},
        onTurnedOff: () => {},
        onError: (error) => {
          throw error;
        },
      });
      sessions.push(session);
      return session;
    },
    thumbnails: { missing: new Set(), missingCount: () => 0 },
    editor: () => null,
  });
  return { storage, sessions };
}

describe("the slideshow screen's storage and share link (SHARE_LINK.md, In the app)", () => {
  it("gives a server slideshow its share link session, a device slideshow none", () => {
    const server = screenStorage("server");
    const device = screenStorage("device");

    expect(server.storage.shareLink).toBe(server.sessions[0]);
    expect(device.storage.shareLink).toBeNull();
    expect(device.sessions).toEqual([]);
  });

  it("ends the share link session with the screen", () => {
    const { storage, sessions } = screenStorage("server");
    const session = sessions[0];
    if (session === undefined) throw new Error("a server slideshow has a share link session");
    const told: ShareLinkState[] = [];
    session.subscribe((state) => told.push(state));

    storage.dispose();
    session.open();

    expect(session.state.sheet).toBe("share");
    expect(told).toEqual([]);
  });
});
