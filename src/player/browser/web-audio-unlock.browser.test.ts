import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { silentWav } from "../../import/testing/silent-wav";
import { MusicOutput } from "./music-output";
import { AudioElementMusic, createMusicAudioContext } from "./platform";

/** Resolves once `context` runs; a context that never runs times the test out. */
function running(context: AudioContext): Promise<void> {
  return new Promise((resolve) => {
    if (context.state === "running") {
      resolve();
      return;
    }
    context.addEventListener("statechange", function check() {
      if (context.state === "running") {
        context.removeEventListener("statechange", check);
        resolve();
      }
    });
  });
}

describe("AudioElementMusic through Web Audio", () => {
  const urls: string[] = [];
  afterEach(() => urls.splice(0).forEach((url) => URL.revokeObjectURL(url)));

  it("lets the context sound by a play within the user's gesture", async () => {
    const contexts: AudioContext[] = [];
    const output = new MusicOutput(() => {
      const context = createMusicAudioContext();
      if (context !== null) {
        contexts.push(context);
      }
      return context;
    });
    const url = URL.createObjectURL(new Blob([silentWav(2000)], { type: "audio/wav" }));
    urls.push(url);
    const music = new AudioElementMusic(url, output);
    const [context] = contexts;
    if (context === undefined) {
      throw new Error("the browser made no AudioContext");
    }
    let started: Promise<void> = Promise.resolve();
    const button = document.createElement("button");
    button.textContent = "play";
    button.addEventListener("click", () => {
      started = music.play(0.5);
    });
    document.body.append(button);

    await userEvent.click(button);
    button.remove();
    await started;
    await running(context);

    expect(context.state).toBe("running");
    music.dispose();
    await context.close();
  });
});
