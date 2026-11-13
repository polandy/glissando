import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { silentWav } from "../../import/testing/silent-wav";
import { MusicOutput, type MusicVolume } from "./music-output";
import { AudioElementMusic, createMusicAudioContext } from "./platform";

describe("AudioElementMusic", () => {
  const urls: string[] = [];
  afterEach(() => urls.splice(0).forEach((url) => URL.revokeObjectURL(url)));

  /** Keeps the element it routes, so a test can wait on its events. */
  class ElementKeepingOutput extends MusicOutput {
    element: HTMLAudioElement | null = null;
    constructor() {
      super(() => null);
    }
    override route(element: HTMLMediaElement): MusicVolume {
      this.element = element as HTMLAudioElement;
      return super.route(element);
    }
  }

  /** Resolves once the song really plays: its position readable, after the start's own seek. */
  async function reallyPlaying(music: AudioElementMusic, output: ElementKeepingOutput) {
    if (music.playingSeconds() !== null) return;
    await new Promise((resolve) =>
      output.element?.addEventListener("playing", resolve, { once: true }),
    );
  }

  async function musicWithUserActivation(output?: MusicOutput): Promise<AudioElementMusic> {
    const button = document.createElement("button");
    button.textContent = "start";
    document.body.append(button);
    await userEvent.click(button);
    button.remove();
    const url = URL.createObjectURL(new Blob([silentWav(2000)], { type: "audio/wav" }));
    urls.push(url);
    return new AudioElementMusic(url, output);
  }

  it("treats a start interrupted by a pause, as a quick seek does, as no refusal", async () => {
    const music = await musicWithUserActivation();

    const started = music.play(0.5);
    music.pause();

    await expect(started).resolves.toBeUndefined();
    music.dispose();
  });

  it("reports no position before it plays and none once paused", async () => {
    const music = await musicWithUserActivation();
    expect(music.playingSeconds()).toBeNull();

    await music.play(0.5);
    music.pause();

    expect(music.playingSeconds()).toBeNull();
    music.dispose();
  });

  it("does not start the music when it seeks", async () => {
    const music = await musicWithUserActivation();

    music.seek(0.5);

    expect(music.playingSeconds()).toBeNull();
    music.dispose();
  });

  it("resumes a song within a frame of where it paused without seeking it", async () => {
    const output = new ElementKeepingOutput();
    const music = await musicWithUserActivation(output);
    await music.play(0.5);
    await reallyPlaying(music, output);
    const place = music.playingSeconds();
    expect(place).not.toBeNull();
    music.pause();

    const resumed = music.play((place ?? 0) + 0.02);

    // A seek would make the position unreadable until it lands.
    expect(music.playingSeconds()).not.toBeNull();
    await expect(resumed).resolves.toBeUndefined();
    music.dispose();
  });

  it("seeks a song that resumes further from where it paused", async () => {
    const output = new ElementKeepingOutput();
    const music = await musicWithUserActivation(output);
    await music.play(0.5);
    await reallyPlaying(music, output);
    const place = music.playingSeconds();
    expect(place).not.toBeNull();
    music.pause();

    const resumed = music.play((place ?? 0) + 1);

    expect(music.playingSeconds()).toBeNull();
    await expect(resumed).resolves.toBeUndefined();
    music.dispose();
  });

  it("plays routed through Web Audio", async () => {
    const output = new MusicOutput(createMusicAudioContext);
    const music = await musicWithUserActivation(output);

    await expect(music.play(0.5)).resolves.toBeUndefined();
    music.setVolume(0.5);
    music.pause();
    music.dispose();
  });
});
