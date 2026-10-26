import { afterEach, describe, expect, it } from "vitest";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import MoodPictureTimesSection from "./MoodPictureTimesSection.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

function mount(fittedShareMs?: number) {
  const mounted = mountWithTranslator(
    MoodPictureTimesSection,
    {
      moodPictureLength: { mood: "calm", beatsPerMinute: 60 },
      fittedShareMs,
      onSetOwnPictureTimes: () => {},
    },
    { current: createTranslator("en") },
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

describe("MoodPictureTimesSection", () => {
  it("notes the shrunk share once the mood's pictures fit a shorter music", () => {
    const target = mount(3_300);

    expect(target.textContent).toContain("Shortened to 3.3 s to fit the music");
  });

  it("shows no such note while the mood's pictures do not need to shrink", () => {
    const target = mount(undefined);

    expect(target.textContent).not.toContain("Shortened to");
  });
});
