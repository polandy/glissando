import { describe, expect, it } from "vitest";
import type { Command, PlaybackState } from "../tv-remote/tv-protocol";
import {
  INITIAL_REMOTE_MODEL,
  remoteModelAfter,
  remoteScreen,
  type RemoteEvent,
  type RemoteModel,
} from "./remote-model";

const playing: PlaybackState = {
  playing: true,
  ended: false,
  needsTvOk: false,
  positionSeconds: 10,
  durationSeconds: 200,
  pictureIndex: 18,
  pictureCount: 48,
  volume: 0.7,
  title: "July 2025",
};
const paused: PlaybackState = { ...playing, playing: false };
const finished: PlaybackState = { ...playing, playing: false, ended: true, positionSeconds: 200 };
const pause: Command = { type: "pause" };

/** The model after `events`, each at `atMs` 1000. */
function after(...events: RemoteEvent[]): RemoteModel {
  return events.reduce(
    (model, event) => remoteModelAfter(model, event, 1000),
    INITIAL_REMOTE_MODEL,
  );
}

const connected = (state: PlaybackState | null = playing): RemoteEvent => ({
  type: "snapshot",
  tvPresent: true,
  state,
});

describe("the remote's pill and controls", () => {
  it.each<[string, string, boolean, RemoteEvent[]]>([
    ["before the stream's first snapshot", "connecting", false, []],
    ["with the TV there and playing", "showing", true, [connected()]],
    ["while the stream reconnects", "reconnecting", false, [connected(), { type: "lost" }]],
    ["once the stream is back", "showing", true, [connected(), { type: "lost" }, connected()]],
    ["when the TV went away", "tvAway", false, [connected(), { type: "tv", present: false }]],
    [
      "when the TV came back",
      "showing",
      true,
      [connected(), { type: "tv", present: false }, { type: "tv", present: true }],
    ],
    [
      "when a command found no TV (409 tvAway)",
      "tvAway",
      false,
      [connected(), { type: "commandFailed", command: pause, reason: "tvAway" }],
    ],
  ])("%s: pill %s, controls enabled %s", (_name, pill, enabled, events) => {
    const screen = remoteScreen(after(...events), 1000);
    expect(screen.pill).toBe(pill);
    expect(screen.controlsEnabled).toBe(enabled);
  });

  it("keeps the controls off while the TV is there but shows nothing yet", () => {
    const screen = remoteScreen(after(connected(null)), 1000);
    expect(screen.pill).toBe("showing");
    expect(screen.show).toBeNull();
    expect(screen.controlsEnabled).toBe(false);
  });

  it("notes that the TV closed its page only while the TV is away", () => {
    expect(remoteScreen(after(connected()), 1000).tvAwayNote).toBe(false);
    expect(remoteScreen(after(connected(), { type: "tv", present: false }), 1000).tvAwayNote).toBe(
      true,
    );
  });

  it("notes that the TV needs one OK for sound while it says so", () => {
    expect(remoteScreen(after(connected()), 1000).needsTvOkNote).toBe(false);
    expect(remoteScreen(after(connected({ ...paused, needsTvOk: true })), 1000).needsTvOkNote).toBe(
      true,
    );
  });
});

describe("the remote's slideshow card", () => {
  it.each<[string, PlaybackState, string]>([
    ["playing", playing, "playing"],
    ["paused", paused, "paused"],
    ["at its end", finished, "finished"],
  ])("tells a slideshow %s as %s", (_name, state, playback) => {
    expect(remoteScreen(after(connected(state)), 1000).show).toEqual({
      title: "July 2025",
      pictureNumber: 19,
      pictureCount: 48,
      playback,
      positionSeconds: state.positionSeconds,
      durationSeconds: 200,
      volume: 0.7,
    });
  });

  it("takes each state report over the snapshot", () => {
    const model = after(connected(), { type: "state", state: { ...paused, pictureIndex: 3 } });
    expect(remoteScreen(model, 1000).show?.pictureNumber).toBe(4);
  });
});

describe("the remote's position", () => {
  it("advances from the last report by the clock while playing", () => {
    const model = remoteModelAfter(INITIAL_REMOTE_MODEL, connected(), 5000);
    expect(remoteScreen(model, 7500).show?.positionSeconds).toBe(12.5);
  });

  it("is corrected by each report", () => {
    const first = remoteModelAfter(INITIAL_REMOTE_MODEL, connected(), 5000);
    const corrected = remoteModelAfter(
      first,
      { type: "state", state: { ...playing, positionSeconds: 30 } },
      9000,
    );
    expect(remoteScreen(corrected, 10_000).show?.positionSeconds).toBe(31);
  });

  it("stands still while paused", () => {
    const model = remoteModelAfter(INITIAL_REMOTE_MODEL, connected(paused), 5000);
    expect(remoteScreen(model, 60_000).show?.positionSeconds).toBe(10);
  });

  it("never runs past the slideshow's end", () => {
    const model = remoteModelAfter(INITIAL_REMOTE_MODEL, connected(), 0);
    expect(remoteScreen(model, 1_000_000).show?.positionSeconds).toBe(200);
  });

  it("stands still while the stream reconnects", () => {
    const open = remoteModelAfter(INITIAL_REMOTE_MODEL, connected(), 0);
    const lost = remoteModelAfter(open, { type: "lost" }, 2000);
    expect(remoteScreen(lost, 60_000).show?.positionSeconds).toBe(12);
  });
});

describe("the remote's end", () => {
  it.each<[string, RemoteEvent]>([
    ["the stream says end", { type: "end" }],
    [
      "a command finds no session (404 noSuchTv)",
      { type: "commandFailed", command: pause, reason: "ended" },
    ],
  ])("ends when %s", (_name, event) => {
    const screen = remoteScreen(after(connected(), event), 1000);
    expect(screen.ended).toBe(true);
    expect(screen.controlsEnabled).toBe(false);
  });

  it("stays ended whatever the stream does after", () => {
    const screen = remoteScreen(
      after(connected(), { type: "end" }, { type: "lost" }, connected()),
      1000,
    );
    expect(screen.ended).toBe(true);
  });

  it("is not ended while connected", () => {
    expect(remoteScreen(after(connected()), 1000).ended).toBe(false);
  });
});

describe("a command that failed", () => {
  it("is kept to be tried again", () => {
    const screen = remoteScreen(
      after(connected(), { type: "commandFailed", command: pause, reason: "failed" }),
      1000,
    );
    expect(screen.failedCommand).toEqual(pause);
    expect(screen.controlsEnabled).toBe(true);
  });

  it("is cleared by the next command that arrives", () => {
    const screen = remoteScreen(
      after(
        connected(),
        { type: "commandFailed", command: pause, reason: "failed" },
        { type: "commandSent" },
      ),
      1000,
    );
    expect(screen.failedCommand).toBeNull();
  });

  it("is no error when the TV was away, which the pill tells", () => {
    const screen = remoteScreen(
      after(connected(), { type: "commandFailed", command: pause, reason: "tvAway" }),
      1000,
    );
    expect(screen.pill).toBe("tvAway");
    expect(screen.failedCommand).toBeNull();
  });
});
