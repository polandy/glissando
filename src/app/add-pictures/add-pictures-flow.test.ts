import { describe, expect, it } from "vitest";
import { setUp, SHOW_1, SHOW_2 } from "./testing/add-pictures-flow-fixtures";

describe("AddPicturesFlow", () => {
  it("opens the add screen with one session per slideshow, kept across visits", () => {
    const { flow, sessions, opened } = setUp();

    flow.open(SHOW_1, "device");
    flow.open(SHOW_1, "device");

    expect(sessions).toHaveLength(1);
    expect(flow.session).toBe(sessions[0]);
    expect(opened).toEqual([
      { screen: "add", slideshowId: "s1" },
      { screen: "add", slideshowId: "s1" },
    ]);
  });

  it("opens the session for where the slideshow lives", () => {
    const { flow, sessions } = setUp();

    flow.open(SHOW_1, "server");

    expect(sessions.map(({ home }) => home)).toEqual(["server"]);
  });

  it("opens the add screen with files chosen elsewhere already being taken in", () => {
    const { flow, sessions, opened } = setUp();

    flow.open(SHOW_1, "device", [new File(["x"], "beach.jpg")]);

    expect(opened).toEqual([{ screen: "add", slideshowId: "s1" }]);
    expect(sessions[0]?.addedFiles).toEqual(["beach.jpg"]);
  });

  it("reopening the same slideshow hands its session the record as stored now", () => {
    const { flow, sessions } = setUp();
    flow.open(SHOW_1, "device");

    flow.open({ ...SHOW_1, title: "Renamed" }, "device");

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.refreshedWith).toEqual(["Renamed"]);
  });

  it("ignores a discard while the pictures are being added, and navigates once", async () => {
    const { flow, sessions, log, opened } = setUp();
    flow.open(SHOW_1, "device");
    const commit = flow.commit();
    expect(flow.committing).toBe(true);

    void flow.discard(true);
    sessions[0]?.committed(["p1"]);
    await commit;

    expect(flow.committing).toBe(false);
    expect(flow.added).toEqual({ slideshowId: "s1", pictureIds: ["p1"] });
    expect(opened).toEqual([
      { screen: "add", slideshowId: "s1" },
      { screen: "slideshow", slideshowId: "s1" },
    ]);
    expect(log).toEqual(["delete abandoned media", "look for focus"]);
    expect(sessions[0]?.discardCalls).toBe(0);
  });

  it("discards the selection for another slideshow when adding to a new one, then cleans up", async () => {
    const { flow, sessions, log } = setUp();
    flow.open(SHOW_1, "device");

    flow.open(SHOW_2, "device");
    expect(flow.session?.slideshowId).toBe("s2");
    expect(log).toEqual([]);
    sessions[0]?.discarded();
    await flow.settled();

    expect(log).toEqual(["delete abandoned media"]);
  });

  it("discarding leaves for the slideshow and deletes the media once the store spares it", async () => {
    const { flow, log, sessions } = setUp();
    flow.open(SHOW_1, "device");

    const discarding = flow.discard(true);
    expect(flow.session).toBeNull();
    expect(log).toEqual(["back"]);
    sessions[0]?.discarded();
    await discarding;

    expect(log).toEqual(["back", "delete abandoned media"]);
  });

  it("reports a failed discard instead of cleaning up", async () => {
    const { flow, log, sessions, errors } = setUp();
    flow.open(SHOW_1, "device");
    const failure = new Error("release failed");

    const discarding = flow.discard(false);
    sessions[0]?.failDiscard(failure);
    await discarding;

    expect(errors).toEqual([failure]);
    expect(log).toEqual([]);
  });
});
