import { describe, expect, it } from "vitest";
import { CODE, SECRET, SLIDESHOWS, harness } from "./tv-session-fixtures";

async function connected(options: Parameters<typeof harness>[0] = {}) {
  const parts = harness(options);
  parts.session.open(CODE);
  await parts.api.settled();
  return parts;
}

describe("the TV sheet's pick step (tv_remote/IN_THE_APP.md)", () => {
  it("selects the slideshow the sheet was opened from", async () => {
    const { session } = await connected({ openedFrom: "hike" });

    expect(session.state.selected).toBe("hike");
  });

  it("selects the newest slideshow when opened from the start screen", async () => {
    const { session } = await connected({ openedFrom: null });

    expect(session.state.selected).toBe("july");
  });

  it("shows the chosen slideshow and opens the remote page", async () => {
    const { session, api, opened } = await connected();
    session.select("july");

    await session.show();

    expect(api.shown).toEqual([{ remoteSecret: SECRET, slideshowId: "july" }]);
    expect(opened).toEqual([`/r/${SECRET}`]);
  });

  it("does not disconnect the TV it handed over to the remote page", async () => {
    const { session, api, opened } = await connected();
    await session.show();

    session.close();
    await api.settled();

    expect(opened).toHaveLength(1);
    expect(api.disconnected).toEqual([]);
  });

  it("goes back to the code step saying the TV was closed when the session ended", async () => {
    const { session, api, opened } = await connected();
    api.ended.add(SECRET);

    await session.show();

    expect(session.state).toMatchObject({ step: "code", code: "", tvClosed: true });
    expect(opened).toEqual([]);
    session.type("K");
    expect(session.state.tvClosed).toBe(false);
  });

  it("reads the list again when the chosen slideshow is gone", async () => {
    const { session, api, errors } = await connected({ openedFrom: "hike" });
    api.slideshows = api.slideshows.filter(({ id }) => id !== "hike");

    await session.show();
    await api.settled();

    expect(session.state.slideshows?.map(({ id }) => id)).toEqual(["july"]);
    expect(session.state.selected).toBe("july");
    expect(errors).toEqual([]);
  });

  it("offers Try again when the server does not answer show, which shows", async () => {
    const { session, api, opened } = await connected();
    api.down = true;

    await session.show();
    expect(session.state.unanswered).toBe("show");
    api.down = false;
    await session.retry();

    expect(opened).toEqual([`/r/${SECRET}`]);
  });

  it("offers Try again when the list does not come, which reads it", async () => {
    const { session, api } = harness();
    api.listDown = true;
    session.open(CODE);
    await api.settled();
    expect(session.state).toMatchObject({
      step: "pick",
      unanswered: "list",
      slideshows: undefined,
    });
    api.listDown = false;

    await session.retry();

    expect(session.state.slideshows).toEqual(SLIDESHOWS);
  });

  it("disconnects when the sheet closes before a slideshow was shown", async () => {
    const { session, api } = await connected();

    session.close();
    await api.settled();

    expect(session.state.step).toBe("closed");
    expect(api.disconnected).toEqual([SECRET]);
  });

  it("disconnects a TV still waiting for its slideshow when the screen closes", async () => {
    const { session, api } = await connected();
    const told: unknown[] = [];
    session.subscribe((state) => told.push(state));

    session.dispose();
    await api.settled();

    expect(api.disconnected).toEqual([SECRET]);
    expect(told).toEqual([]);
  });

  it("logs a disconnect the server did not answer, the sheet closed all the same", async () => {
    const { session, api, logged, errors } = await connected();
    api.down = true;

    session.close();
    await api.settled();

    expect(session.state.step).toBe("closed");
    expect(logged).toHaveLength(1);
    expect(errors).toEqual([]);
  });
});
