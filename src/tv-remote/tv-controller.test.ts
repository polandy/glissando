import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../ui-kit/testing/fake-scheduler";
import {
  createTvController,
  REPORT_EVERY_MS,
  type CommandNote,
  type PlayerControl,
} from "./tv-controller";
import type { Command, PlaybackState } from "./tv-protocol";

/** Four pictures of 10 s each: they start at 0, 10, 20 and 30 s. */
const PICTURE_STARTS = [0, 10, 20, 30];
const DURATION = 40;
const TITLE = "Generated test show";

class FakePlayer implements PlayerControl {
  paused = true;
  ended = false;
  currentTime = 0;
  readonly duration = DURATION;
  readonly pictureStarts = PICTURE_STARTS;
  volume = 1;
  playRefused = false;
  play(): void {
    this.paused = false;
    this.ended = false;
  }
  pause(): void {
    this.paused = true;
  }
  seek(seconds: number): void {
    this.currentTime = seconds;
  }
}

function controlled(setUp: (player: FakePlayer) => void = () => undefined) {
  const player = new FakePlayer();
  setUp(player);
  const scheduler = new FakeScheduler();
  const reports: PlaybackState[] = [];
  const notes: CommandNote[] = [];
  const controller = createTvController({
    control: player,
    title: TITLE,
    scheduler,
    report: (state) => reports.push(state),
    note: (note) => notes.push(note),
  });
  return { player, scheduler, reports, notes, controller };
}

describe("the TV controller's commands", () => {
  it.each<{ name: string; at: number; command: Command; to: number }>([
    { name: "next goes to the next picture's start", at: 12, command: { type: "next" }, to: 20 },
    { name: "next on the last picture goes to the end", at: 33, command: { type: "next" }, to: 40 },
    {
      name: "previous well into a picture goes back to its start",
      at: 15,
      command: { type: "previous" },
      to: 10,
    },
    {
      name: "previous just after a picture started goes to the one before",
      at: 11.5,
      command: { type: "previous" },
      to: 0,
    },
    {
      name: "previous exactly 2 s in goes back to the same picture's start",
      at: 12,
      command: { type: "previous" },
      to: 10,
    },
    {
      name: "previous on the first picture stays at its start",
      at: 1,
      command: { type: "previous" },
      to: 0,
    },
    { name: "seek goes where it says", at: 3, command: { type: "seek", value: 27.5 }, to: 27.5 },
    {
      name: "seek past the end stops at the end",
      at: 3,
      command: { type: "seek", value: 99 },
      to: 40,
    },
  ])("$name", ({ at, command, to }) => {
    const { player, controller } = controlled((fake) => {
      fake.currentTime = at;
    });

    controller.apply(command);

    expect(player.currentTime).toBe(to);
  });

  it("plays and pauses, each with its note", () => {
    const { player, controller, notes } = controlled();

    controller.apply({ type: "play" });
    expect(player.paused).toBe(false);
    controller.apply({ type: "pause" });

    expect(player.paused).toBe(true);
    expect(notes).toEqual([{ kind: "playing" }, { kind: "paused" }]);
  });

  it("restarts from the first picture and plays", () => {
    const { player, controller } = controlled((fake) => {
      fake.currentTime = DURATION;
      fake.ended = true;
    });

    controller.apply({ type: "restart" });

    expect(player.currentTime).toBe(0);
    expect(player.paused).toBe(false);
  });

  it("sets the music's volume and notes it in percent", () => {
    const { player, controller, notes } = controlled();

    controller.apply({ type: "volume", value: 0.7 });

    expect(player.volume).toBe(0.7);
    expect(notes).toEqual([{ kind: "volume", percent: 70 }]);
  });

  it("notes next and previous", () => {
    const { controller, notes } = controlled();

    controller.apply({ type: "next" });
    controller.apply({ type: "previous" });

    expect(notes).toEqual([{ kind: "next" }, { kind: "previous" }]);
  });
});

describe("the TV controller's reports", () => {
  it("reports the playback after each command", () => {
    const { controller, reports } = controlled((fake) => {
      fake.currentTime = 12;
    });

    controller.apply({ type: "volume", value: 0.5 });

    expect(reports).toEqual([
      {
        playing: false,
        ended: false,
        needsTvOk: false,
        positionSeconds: 12,
        durationSeconds: DURATION,
        pictureIndex: 1,
        pictureCount: 4,
        volume: 0.5,
        title: TITLE,
      },
    ]);
  });

  it("reports needsTvOk while the browser refused to play the music", () => {
    const { player, controller, reports } = controlled();
    controller.apply({ type: "play" });

    player.paused = true;
    player.playRefused = true;
    controller.playerChanged("refused");

    expect(reports.at(-1)).toMatchObject({ playing: false, needsTvOk: true });
  });

  it("reports at once when asked, for a remote that has only just come", () => {
    const { controller, reports } = controlled();

    controller.report();

    expect(reports).toEqual([expect.objectContaining({ playing: false, title: TITLE })]);
  });

  it("reports the end of the slideshow", () => {
    const { player, controller, reports } = controlled();
    player.currentTime = DURATION;
    player.ended = true;

    controller.playerChanged("ended");

    expect(reports.at(-1)).toMatchObject({ ended: true, pictureIndex: 3 });
  });

  it("reports a new picture as the time passes, and not each frame of the same one", () => {
    const { player, controller, reports } = controlled();
    player.currentTime = 4;
    controller.playerChanged("time");
    player.currentTime = 6;
    controller.playerChanged("time");
    player.currentTime = 10;
    controller.playerChanged("time");

    expect(reports.map((state) => state.positionSeconds)).toEqual([4, 10]);
  });

  it("reports every few seconds while playing, and stops once paused", () => {
    const { player, scheduler, controller, reports } = controlled();
    controller.apply({ type: "play" });
    player.currentTime = 3;
    scheduler.advance(REPORT_EVERY_MS);
    expect(reports.map((state) => state.positionSeconds)).toEqual([0, 3]);

    controller.apply({ type: "pause" });
    scheduler.advance(REPORT_EVERY_MS * 3);

    expect(reports.map((state) => state.playing)).toEqual([true, true, false]);
    expect(scheduler.pending).toBe(0);
  });

  it("reports nothing more once stopped", () => {
    const { scheduler, controller, reports } = controlled();
    controller.apply({ type: "play" });

    controller.stop();
    controller.playerChanged("pause");
    scheduler.advance(REPORT_EVERY_MS);

    expect(reports).toHaveLength(1);
    expect(scheduler.pending).toBe(0);
  });
});
