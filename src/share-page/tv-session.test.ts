import { describe, expect, it, vi } from "vitest";
import { FakeScheduler } from "../ui-kit/testing/fake-scheduler";
import {
  TvAnswerError,
  TvGoneError,
  TvUnreachableError,
  type EventSourcePort,
  type TvApi,
} from "../tv-remote/tv-api";
import type { CommandNote, PlayerControl } from "../tv-remote/tv-controller";
import type { PlaybackState } from "../tv-remote/tv-protocol";
import { openTvSession, type TvPageEvent } from "./tv-session";

const TV_KEY = "TvKeyTvKeyTvKeyTvKey12";

class FakeEventSource extends EventTarget implements EventSourcePort {
  readyState = 1;
  closed = false;
  send(name: string, data: unknown): void {
    this.dispatchEvent(new MessageEvent(name, { data: JSON.stringify(data) }));
  }
  close(): void {
    this.closed = true;
  }
}

class FakePlayer implements PlayerControl {
  paused = true;
  ended = false;
  currentTime = 0;
  duration = 20;
  pictureStarts = [0, 10];
  volume = 1;
  playRefused = false;
  play(): void {
    this.paused = false;
  }
  pause(): void {
    this.paused = true;
  }
  seek(seconds: number): void {
    this.currentTime = seconds;
  }
}

function session(report: TvApi["report"] = () => Promise.resolve()) {
  const source = new FakeEventSource();
  const reports: PlaybackState[] = [];
  const events: TvPageEvent[] = [];
  const notes: CommandNote[] = [];
  const api: TvApi = {
    createSession: () => Promise.reject(new Error("not asked")),
    createLinkedSession: () => Promise.reject(new Error("not asked")),
    report(tvKey, state) {
      reports.push(state);
      return report(tvKey, state);
    },
  };
  const scheduler = new FakeScheduler();
  const opened = openTvSession(
    { api, openEvents: () => source, scheduler },
    { tvKey: TV_KEY, note: (note) => notes.push(note), event: (event) => events.push(event) },
  );
  return { source, reports, events, notes, scheduler, session: opened };
}

describe("a TV session", () => {
  it("applies a command to the driven player, notes it and reports", () => {
    const { source, reports, notes, session: tv } = session();
    const player = new FakePlayer();
    tv.drive(player, "Generated");

    source.send("command", { type: "play" });

    expect(player.paused).toBe(false);
    expect(notes).toEqual([{ kind: "playing" }]);
    expect(reports.map((state) => [state.playing, state.title])).toEqual([
      [false, "Generated"],
      [true, "Generated"],
    ]);
  });

  it("hands every other event to the page, and no command", () => {
    const { source, events } = session();

    source.send("claimed", {});
    source.send("command", { type: "pause" });
    source.send("remote", { present: true });

    expect(events).toEqual([{ type: "claimed" }, { type: "remote", present: true }]);
  });

  it("leaves a released player alone", () => {
    const { source, reports, session: tv } = session();
    const player = new FakePlayer();
    tv.drive(player, "Generated");

    tv.release();
    source.send("command", { type: "play" });
    tv.playerChanged("pause");

    expect(player.paused).toBe(true);
    expect(reports).toHaveLength(1);
  });

  it("closes the stream and stops reporting on close", () => {
    const { source, scheduler, session: tv } = session();
    const player = new FakePlayer();
    tv.drive(player, "Generated");
    source.send("command", { type: "play" });

    tv.close();

    expect(source.closed).toBe(true);
    expect(scheduler.pending).toBe(0);
  });

  it.each([
    { what: "a gone session", error: new TvGoneError("gone"), logged: 0 },
    { what: "a server away", error: new TvUnreachableError("away"), logged: 0 },
    { what: "any other answer", error: new TvAnswerError("400"), logged: 1 },
  ])("logs a refused report only for $what that is no state of the session", async (refusal) => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let refused: Promise<void> = Promise.resolve();
    const { session: tv } = session(() => (refused = Promise.reject(refusal.error)));

    tv.drive(new FakePlayer(), "Generated");
    await refused.catch(() => undefined);
    await Promise.resolve();

    expect(logged).toHaveBeenCalledTimes(refusal.logged);
    logged.mockRestore();
  });
});
