import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { silentWav } from "../../import/testing/silent-wav";
import { AudioElementMusic } from "./platform";

describe("AudioElementMusic", () => {
  const urls: string[] = [];
  afterEach(() => urls.splice(0).forEach((url) => URL.revokeObjectURL(url)));

  async function musicWithUserActivation(): Promise<AudioElementMusic> {
    const button = document.createElement("button");
    button.textContent = "start";
    document.body.append(button);
    await userEvent.click(button);
    button.remove();
    const url = URL.createObjectURL(new Blob([silentWav(2000)], { type: "audio/wav" }));
    urls.push(url);
    return new AudioElementMusic(url);
  }

  it("treats a start interrupted by a pause, as a quick seek does, as no refusal", async () => {
    const music = await musicWithUserActivation();

    const started = music.play(0.5);
    music.pause();

    await expect(started).resolves.toBeUndefined();
    music.dispose();
  });
});
