import { describe, expect, it } from "vitest";
import type {
  AudioBufferSourceNodeLike,
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

class FakeBufferSource implements AudioBufferSourceNodeLike {
  buffer: AudioBuffer | null = null;
  readonly connections: AudioNodeLike[] = [];
  connect(destination: AudioNodeLike): void {
    this.connections.push(destination);
  }
  disconnect(): void {
    this.connections.length = 0;
  }
  start(): void {}
  stop(): void {}
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
  createBufferSource(): FakeBufferSource {
    return new FakeBufferSource();
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

  it("plays at full volume until told otherwise", () => {
    const output = new MutableMusicOutput<FakeElement>(() => null);
    const music = element();
    output.route(music).set(0.5);

    expect(output.volume).toBe(1);
    expect(music.volume).toBe(0.5);
  });

  it("scales every element's own volume by the master volume, at once and from then on", () => {
    const output = new MutableMusicOutput<FakeElement>(() => null);
    const music = element();
    const volume = output.route(music);
    volume.set(0.5);

    output.volume = 0.4;
    expect(music.volume).toBeCloseTo(0.2);
    volume.set(1);
    expect(music.volume).toBeCloseTo(0.4);
  });

  it("scales the element's gain through Web Audio, and keeps the volume apart from mute", () => {
    const context = new FakeContext();
    const output = new MutableMusicOutput<FakeElement>(() => context);
    output.route(element()).set(0.5);

    output.volume = 0.6;
    output.muted = true;
    output.muted = false;

    const [master, elementGain] = context.gains;
    expect(master?.value).toBe(1);
    expect(elementGain?.value).toBeCloseTo(0.3);
    expect(output.volume).toBe(0.6);
  });

  it.each([-0.1, 1.1, Number.NaN])("refuses a master volume of %s", (wrong) => {
    const output = new MutableMusicOutput<FakeElement>(() => null);

    expect(() => {
      output.volume = wrong;
    }).toThrow(RangeError);
  });

  it("connects a clip's sound to the same master gain as the music, so muting silences both", () => {
    const context = new FakeContext();
    const output = new MutableMusicOutput<FakeElement>(() => context);
    output.route(element());
    const [master] = context.gains;

    const clipSound = output.clipSoundOutput();

    expect(clipSound?.destination).toBe(master);
    output.muted = true;
    expect(master?.value).toBe(0);
  });

  it("starts an element routed while muted silent", () => {
    const output = new MutableMusicOutput<FakeElement>(() => null);
    output.muted = true;
    const music = element();

    output.route(music);

    expect(music.muted).toBe(true);
  });
});
