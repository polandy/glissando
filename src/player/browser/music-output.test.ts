import { describe, expect, it } from "vitest";
import {
  MusicOutput,
  type AudioNodeLike,
  type GainNodeLike,
  type MusicAudioContext,
  type VolumeElement,
} from "./music-output";

class FakeNode implements AudioNodeLike {
  readonly connectedTo: AudioNodeLike[] = [];
  disconnected = false;
  connect(destination: AudioNodeLike): void {
    this.connectedTo.push(destination);
  }
  disconnect(): void {
    this.disconnected = true;
  }
}

class FakeGainNode extends FakeNode implements GainNodeLike {
  /** Every `setValueAtTime(value, time)` call, in order. */
  readonly scheduled: (readonly [number, number])[] = [];
  readonly gain = {
    setValueAtTime: (value: number, startTime: number) => {
      this.scheduled.push([value, startTime]);
    },
  };
}

class FakeAudioContext implements MusicAudioContext<VolumeElement> {
  currentTime = 0;
  state = "suspended";
  resumeCalls = 0;
  readonly destination = new FakeNode();
  readonly sources = new Map<VolumeElement, FakeNode>();
  readonly gains: FakeGainNode[] = [];
  resume(): Promise<void> {
    this.resumeCalls += 1;
    this.state = "running";
    return Promise.resolve();
  }
  createMediaElementSource(element: VolumeElement): FakeNode {
    const source = new FakeNode();
    this.sources.set(element, source);
    return source;
  }
  createGain(): FakeGainNode {
    const gain = new FakeGainNode();
    this.gains.push(gain);
    return gain;
  }
}

function outputWithContext(): { output: MusicOutput<VolumeElement>; context: FakeAudioContext } {
  const context = new FakeAudioContext();
  return { output: new MusicOutput(() => context), context };
}

describe("MusicOutput", () => {
  it("routes the element through a gain node to the speakers", () => {
    const { output, context } = outputWithContext();
    const element = { volume: 1 };

    output.route(element);

    const gain = context.gains[0];
    expect(context.sources.get(element)?.connectedTo).toEqual([gain]);
    expect(gain?.connectedTo).toEqual([context.destination]);
  });

  it("sets the volume on the gain at the context's current time, leaving the element at 1", () => {
    const { output, context } = outputWithContext();
    const element = { volume: 1 };
    const volume = output.route(element);

    context.currentTime = 2.5;
    volume.set(0.25);
    context.currentTime = 2.6;
    volume.set(0.3);

    expect(context.gains[0]?.scheduled).toEqual([
      [0.25, 2.5],
      [0.3, 2.6],
    ]);
    expect(element.volume).toBe(1);
  });

  it("resumes a suspended context when unlocked, within the gesture's call", () => {
    const { output, context } = outputWithContext();

    output.unlock();

    expect(context.resumeCalls).toBe(1);
  });

  it("does not resume a context that is already running", () => {
    const { output, context } = outputWithContext();
    context.state = "running";

    output.unlock();

    expect(context.resumeCalls).toBe(0);
  });

  it("creates one context for every element it routes", () => {
    let created = 0;
    const output = new MusicOutput(() => {
      created += 1;
      return new FakeAudioContext();
    });

    output.unlock();
    output.route({ volume: 1 });
    output.route({ volume: 1 });

    expect(created).toBe(1);
  });

  it("disconnects the element's nodes when the volume is disposed", () => {
    const { output, context } = outputWithContext();
    const element = { volume: 1 };
    const volume = output.route(element);

    volume.dispose();

    expect(context.sources.get(element)?.disconnected).toBe(true);
    expect(context.gains[0]?.disconnected).toBe(true);
  });

  it.each([
    ["is unavailable", () => null],
    [
      "cannot be created",
      () => {
        throw new Error("no audio hardware");
      },
    ],
  ])("falls back to the element's volume when Web Audio %s", (_, createContext) => {
    const output = new MusicOutput<VolumeElement>(createContext);
    const element = { volume: 1 };
    const volume = output.route(element);

    output.unlock();
    volume.set(0.4);

    expect(element.volume).toBe(0.4);
  });
});
