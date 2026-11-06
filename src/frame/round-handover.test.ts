import { describe, expect, it, vi } from "vitest";
import {
  RoundHandover,
  type FrameRoundPlayer,
  type RoundHandoverPorts,
  type RoundOutcome,
} from "./round-handover";

/** A player stand-in whose "canplay", "playing", "waiting" and "ended" events the test fires by hand. */
class FakePlayer extends EventTarget implements FrameRoundPlayer {
  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly destroy = vi.fn();

  end(): void {
    this.dispatchEvent(new Event("ended"));
  }

  /** The first frame is drawn; a player does this once its picture loaded, before any play(). */
  showFirstPicture(): void {
    this.dispatchEvent(new Event("canplay"));
  }

  startPlaying(): void {
    this.dispatchEvent(new Event("playing"));
  }

  stall(): void {
    this.dispatchEvent(new Event("waiting"));
  }
}

function fakePorts(players: readonly FakePlayer[]): RoundHandoverPorts & { calls: number } {
  let index = 0;
  const ports = {
    get calls() {
      return index;
    },
    createNextRound(): RoundOutcome {
      const player = players[index];
      index += 1;
      return player === undefined ? { kind: "noPicturesLeft" } : { kind: "player", player };
    },
  };
  return ports;
}

describe("RoundHandover", () => {
  it("starts the first round and prepares the next one right away, without playing it", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const ports = fakePorts([first, second]);
    const handover = new RoundHandover(ports);

    handover.start();

    expect(handover.state.player).toBe(first);
    expect(first.play).toHaveBeenCalledOnce();
    expect(ports.calls).toBe(2);
    expect(second.play).not.toHaveBeenCalled();
  });

  it("plays the prepared round only once it is swapped in, so it starts from its first picture", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    second.showFirstPicture();
    expect(second.play).not.toHaveBeenCalled(); // ready, but its turn has not come

    first.end();

    expect(handover.state.player).toBe(second);
    expect(second.play).toHaveBeenCalledOnce();
  });

  it("reports no pictures when the album is empty from the start", () => {
    const handover = new RoundHandover(fakePorts([]));

    handover.start();

    expect(handover.state).toEqual({
      player: null,
      paused: false,
      endOfPictures: true,
      waiting: false,
    });
  });

  it("swaps to the prepared round as soon as the current one ends, if it is already ready", () => {
    const [first, second, third] = [new FakePlayer(), new FakePlayer(), new FakePlayer()];
    const ports = fakePorts([first, second, third]);
    const handover = new RoundHandover(ports);
    handover.start();
    second.showFirstPicture();

    first.end();

    expect(handover.state.player).toBe(second);
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(ports.calls).toBe(3); // the next round is already being prepared, unplayed
    expect(third.play).not.toHaveBeenCalled();
  });

  it("keeps the ended round's last frame until the prepared round is ready", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();

    first.end(); // "second" has not drawn its first picture yet

    expect(handover.state.player).toBe(first);
    expect(first.destroy).not.toHaveBeenCalled();

    second.showFirstPicture();

    expect(handover.state.player).toBe(second);
    expect(first.destroy).toHaveBeenCalledOnce();
  });

  it("skip() hands over early, the same way a natural end does", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    second.showFirstPicture();

    handover.skip();

    expect(handover.state.player).toBe(second);
  });

  it("pauses and resumes the current round", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();

    handover.pause();
    expect(first.pause).toHaveBeenCalledOnce();
    expect(handover.state.paused).toBe(true);

    handover.resume();
    expect(first.play).toHaveBeenCalledTimes(2);
    expect(handover.state.paused).toBe(false);
  });

  it("a skip while paused shows the next round's first picture and leaves it paused; resume plays it", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    second.showFirstPicture();
    handover.pause();

    handover.skip();

    expect(handover.state.player).toBe(second);
    expect(handover.state.paused).toBe(true);
    expect(second.play).not.toHaveBeenCalled();

    handover.resume();

    expect(second.play).toHaveBeenCalledOnce();
    expect(handover.state.paused).toBe(false);
  });

  it("a round ending naturally while paused hands over to the next round and leaves it paused", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    second.showFirstPicture();
    handover.pause();

    first.end();

    expect(handover.state.player).toBe(second);
    expect(handover.state.paused).toBe(true);
    expect(second.play).not.toHaveBeenCalled();
  });

  it("a skip while paused that waits for the prepared round leaves it paused once it is ready", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    handover.pause();
    handover.skip();

    second.showFirstPicture();

    expect(handover.state.player).toBe(second);
    expect(handover.state.paused).toBe(true);
    expect(second.play).not.toHaveBeenCalled();
  });

  it("tears down the current and prepared players on destroy, and stops reacting to them", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();

    handover.destroy();

    expect(first.destroy).toHaveBeenCalledOnce();
    expect(second.destroy).toHaveBeenCalledOnce();
    expect(handover.state.player).toBeNull();

    // A late event from a torn-down player must not resurrect it as the current one.
    second.showFirstPicture();
    first.end();
    expect(handover.state.player).toBeNull();
  });

  it("is waiting until the first round emits playing", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    expect(handover.state.waiting).toBe(true);

    handover.start();
    expect(handover.state.waiting).toBe(true); // play() was called, but not "playing" yet

    first.startPlaying();

    expect(handover.state.waiting).toBe(false);
  });

  it("is waiting again when the current player emits waiting, and not once it plays again", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    first.startPlaying();

    first.stall();
    expect(handover.state.waiting).toBe(true);

    first.startPlaying();
    expect(handover.state.waiting).toBe(false);
  });

  it("is waiting while an ended round waits for the prepared round, not once it swaps in", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    first.startPlaying();

    first.end(); // "second" has not drawn its first picture yet

    expect(handover.state.waiting).toBe(true);

    second.showFirstPicture();

    expect(handover.state.waiting).toBe(false);
  });

  it("is not waiting once the album has nothing left from the start", () => {
    const handover = new RoundHandover(fakePorts([]));

    handover.start();

    expect(handover.state.waiting).toBe(false);
  });

  it("stops reacting to the old player's events once it has been swapped out", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();
    first.startPlaying();
    second.showFirstPicture();
    first.end(); // already ready, so "second" swaps in at once

    expect(handover.state.waiting).toBe(false);

    first.stall(); // a late event from the player that was just swapped out

    expect(handover.state.waiting).toBe(false);
  });

  it("tells subscribers of every hand-over", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    const seen: (FrameRoundPlayer | null)[] = [];
    handover.subscribe((state) => seen.push(state.player));

    handover.start();
    second.showFirstPicture();
    first.end();

    expect(seen).toEqual([null, first, second]);
  });
});
