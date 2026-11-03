import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError } from "../../library/library-store";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { SlideshowChangedError } from "../../server-library/server-slideshow-store";
import { committing, GONE_TEXT, setUp, SHOW_1 } from "./testing/add-pictures-flow-fixtures";

describe("AddPicturesFlow committing", () => {
  it("after adding returns to the slideshow, hands it the new ids and looks for their focus", async () => {
    const { flow, opened, log } = await committing(["p1", "p2"]);

    expect(flow.session).toBeNull();
    expect(flow.added).toEqual({ slideshowId: "s1", pictureIds: ["p1", "p2"] });
    expect(opened.at(-1)).toEqual({ screen: "slideshow", slideshowId: "s1" });
    expect(log).toContain("look for focus");
  });

  it("keeps the new ids in the slideshow's editors and forgets them once it is left", async () => {
    const { flow } = await committing(["p1"]);

    flow.follow({ screen: "picture", slideshowId: "s1", pictureId: "p1" });
    flow.follow({ screen: "slideshow", slideshowId: "s1" });
    expect(flow.added?.pictureIds).toEqual(["p1"]);
    flow.follow({ screen: "start" });

    expect(flow.added).toBeNull();
  });

  it("a slideshow deleted meanwhile leaves with a toast and discards the new media", async () => {
    const { flow, sessions, log, toasts, errors } = setUp();
    flow.open(SHOW_1, "device");

    const commit = flow.commit();
    sessions[0]?.failCommit(new SlideshowNotFoundError("s1"));
    sessions[0]?.discarded();
    await commit;

    expect(flow.session).toBeNull();
    expect(flow.added).toBeNull();
    expect(toasts).toEqual([{ text: GONE_TEXT, tone: "info" }]);
    expect(log).toEqual(["back", "delete abandoned media"]);
    expect(errors).toEqual([]);
  });

  it("reports any other failure to add and keeps the selection", async () => {
    const { flow, sessions, errors } = setUp();
    flow.open(SHOW_1, "device");
    const failure = new Error("store failed");

    const commit = flow.commit();
    sessions[0]?.failCommit(failure);
    await commit;

    expect(errors).toEqual([failure]);
    expect(flow.session).toBe(sessions[0]);
  });

  it("a stale revision adds nothing, shows the current version and says it changed elsewhere", async () => {
    const { flow, sessions, toasts, errors, opened } = setUp();
    flow.open(SHOW_1, "server");

    const commit = flow.commit();
    sessions[0]?.failCommit(new SlideshowChangedError({ ...SHOW_1, title: "Renamed elsewhere" }));
    await commit;

    expect(flow.session).toBe(sessions[0]);
    expect(sessions[0]?.refreshedWith).toEqual(["Renamed elsewhere"]);
    expect(toasts).toEqual([
      { text: "Changed on another device. Showing the latest version.", tone: "info" },
    ]);
    expect(flow.committing).toBe(false);
    expect(opened).toEqual([{ screen: "add", slideshowId: "s1" }]);
    expect(errors).toEqual([]);
  });

  it("a server out of reach adds nothing, keeps the selection and says it couldn't save", async () => {
    const { flow, sessions, toasts, errors } = setUp();
    flow.open(SHOW_1, "server");

    const commit = flow.commit();
    sessions[0]?.failCommit(new ServerLibraryUnavailableError("PUT /api/library/slideshows/s1"));
    await commit;

    expect(flow.session).toBe(sessions[0]);
    expect(sessions[0]?.refreshedWith).toEqual([]);
    expect(toasts).toEqual([
      { text: "Couldn't save. Your Glissando server isn't answering.", tone: "error" },
    ]);
    expect(flow.committing).toBe(false);
    expect(errors).toEqual([]);
  });

  it("leaves a restored add screen or Immich browser whose selection is gone", () => {
    const { flow, log } = setUp();
    flow.open(SHOW_1, "device");

    flow.follow({ screen: "add", slideshowId: "s1" });
    flow.follow({ screen: "immich", albumId: null, slideshowId: null });
    expect(log).toEqual([]);
    flow.follow({ screen: "immich", albumId: "a1", slideshowId: "s2" });

    expect(log).toEqual(["back"]);
  });
});
