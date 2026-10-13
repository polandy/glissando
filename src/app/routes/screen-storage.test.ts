import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { ShareLinkSession, type ShareLinkState } from "../share-link/share-link-session";
import { FakeShareLinkApi } from "../share-link/testing/fake-share-link-api";
import type { TvSession } from "../tv-remote/tv-session";
import { harness } from "../tv-remote/tv-session-fixtures";
import { ScreenStorage } from "./screen-storage.svelte";
import type { SlideshowHome } from "./slideshow-storage";

function screenStorage(home: SlideshowHome) {
  const sessions: ShareLinkSession[] = [];
  const tvSessions: TvSession[] = [];
  const storage = new ScreenStorage({
    home,
    slideshowId: "show",
    sessions: {
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
      newTvSession: (slideshowId) => {
        const { session } = harness({ openedFrom: slideshowId });
        tvSessions.push(session);
        return session;
      },
    },
    thumbnails: { missing: new Set(), missingCount: () => 0 },
    editor: () => null,
  });
  return { storage, sessions, tvSessions };
}

describe("the slideshow screen's storage, share link and TV (share_link/, tv_remote/)", () => {
  it("gives a server slideshow its share link and TV sessions, a device slideshow none", () => {
    const server = screenStorage("server");
    const device = screenStorage("device");

    expect(server.storage.serverRows).toEqual({
      shareLink: server.sessions[0],
      tv: server.tvSessions[0],
    });
    expect(device.storage.serverRows).toBeNull();
    expect(device.sessions).toEqual([]);
    expect(device.tvSessions).toEqual([]);
  });

  it("ends the share link and TV sessions with the screen", () => {
    const { storage, sessions, tvSessions } = screenStorage("server");
    const tv = tvSessions[0];
    if (tv === undefined) throw new Error("a server slideshow has a TV session");
    const toldTv: unknown[] = [];
    tv.subscribe((state) => toldTv.push(state));
    const session = sessions[0];
    if (session === undefined) throw new Error("a server slideshow has a share link session");
    const told: ShareLinkState[] = [];
    session.subscribe((state) => told.push(state));

    storage.dispose();
    session.open();
    tv.open();

    expect(session.state.sheet).toBe("share");
    expect(told).toEqual([]);
    expect(tv.state.step).toBe("code");
    expect(toldTv).toEqual([]);
  });
});
