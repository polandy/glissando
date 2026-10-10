import { describe, expect, it } from "vitest";
import type {
  AudioNodeLike,
  GainNodeLike,
  MusicAudioContext,
} from "../player/browser/music-output";
import { MutableMusicOutput } from "./mutable-music-output";

interface FakeElement {
  volume: number;
  muted: boolean;
}

class FakeNode implements GainNodeLike {
  readonly connections: AudioNodeLike[] = [];
  value = 1;
  readonly gain = {
    setValueAtTime: (value: number) => {
      this.value = value;
    },
  };
  connect(destination: AudioNodeLike): void {
    this.connections.push(destination);
  }
  disconnect(): void {
    this.connections.length = 0;
  }
}

class FakeContext implements MusicAudioContext<FakeElement> {
  readonly currentTime = 0;
  readonly state = "running";
  readonly destination = new FakeNode();
  readonly gains: FakeNode[] = [];
  resume(): Promise<void> {
    return Promise.resolve();
  }
  createMediaElementSource(): AudioNodeLike {
    return new FakeNode();
  }
  createGain(): FakeNode {
    const gain = new FakeNode();
    this.gains.push(gain);
    return gain;
  }
}

const element = (): FakeElement => ({ volume: 1, muted: false });

describe("MutableMusicOutput", () => {
  it("routes the music through one master gain that silences it when muted", () => {
    const context = new FakeContext();
    const output = new MutableMusicOutput<FakeElement>(() => context);
    const volume = output.route(element());
    volume.set(0.5);

    output.muted = true;

    const [master, elementGain] = context.gains;
    expect(master?.connections).toEqual([context.destination]);
    expect(elementGain?.connections).toEqual([master]);
    expect(elementGain?.value).toBe(0.5);
    expect(master?.value).toBe(0);
    output.muted = false;
    expect(master?.value).toBe(1);
  });

  it("mutes the element itself where the browser has no Web Audio", () => {
    const output = new MutableMusicOutput<FakeElement>(() => null);
    const music = element();
    output.route(music);

    output.muted = true;

    expect(output.muted).toBe(true);
    expect(music.muted).toBe(true);
  });

  it("starts an element routed while muted silent", () => {
    const output = new MutableMusicOutput<FakeElement>(() => null);
    output.muted = true;
    const music = element();

    output.route(music);

    expect(music.muted).toBe(true);
  });
});
