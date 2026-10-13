import { describe, expect, it, vi } from "vitest";
import {
  RoundHandover,
  type FrameRoundPlayer,
  type RoundHandoverPorts,
  type RoundOutcome,
} from "./round-handover";

/** A player stand-in whose "ended" and "playing" events the test fires by hand. */
class FakePlayer extends EventTarget implements FrameRoundPlayer {
  readonly play = vi.fn();
  readonly pause = vi.fn();
  readonly destroy = vi.fn();

  end(): void {
    this.dispatchEvent(new Event("ended"));
  }

  showFirstPicture(): void {
    this.dispatchEvent(new Event("playing"));
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
  it("starts the first round and prepares the next one right away", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const ports = fakePorts([first, second]);
    const handover = new RoundHandover(ports);

    handover.start();

    expect(handover.state.player).toBe(first);
    expect(first.play).toHaveBeenCalledOnce();
    expect(second.play).toHaveBeenCalledOnce();
    expect(ports.calls).toBe(2);
  });

  it("reports no pictures when the album is empty from the start", () => {
    const handover = new RoundHandover(fakePorts([]));

    handover.start();

    expect(handover.state).toEqual({ player: null, paused: false, endOfPictures: true });
  });

  it("swaps to the prepared round as soon as the current one ends, if it is already ready", () => {
    const [first, second, third] = [new FakePlayer(), new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second, third]));
    handover.start();
    second.showFirstPicture();

    first.end();

    expect(handover.state.player).toBe(second);
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(third.play).toHaveBeenCalledOnce(); // the next round is already being prepared
  });

  it("keeps the ended round's last frame until the prepared round is ready", () => {
    const [first, second] = [new FakePlayer(), new FakePlayer()];
    const handover = new RoundHandover(fakePorts([first, second]));
    handover.start();

    first.end(); // "second" has not fired "playing" yet

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
