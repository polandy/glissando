import { afterEach, describe, expect, it } from "vitest";
import { createRawSnippet } from "svelte";
import { createTranslator } from "../i18n/translator";
import { mountWithTranslator } from "../testing/mount-with-translator";
import MoodPictureTimesSection from "./MoodPictureTimesSection.svelte";

let unmounts: (() => void)[] = [];
afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
});

const NOTICE_TEXT = "the one outcome line";

function mount(withNotice: boolean) {
  const notice = createRawSnippet(() => ({
    render: () => `<p class="length-notice">${NOTICE_TEXT}</p>`,
  }));
  const mounted = mountWithTranslator(
    MoodPictureTimesSection,
    {
      moodPictureLength: { mood: "calm", beatsPerMinute: 60 },
      ...(withNotice ? { notice } : {}),
      onSetOwnPictureTimes: () => {},
    },
    { current: createTranslator("en") },
  );
  unmounts.push(mounted.destroy);
  return mounted.target;
}

describe("MoodPictureTimesSection", () => {
  it("renders the outcome line it is given, and no boxed paragraph of its own", () => {
    const target = mount(true);

    expect(target.textContent).toContain(NOTICE_TEXT);
    expect(target.textContent).not.toContain("Shortened to");
  });

  it("renders no outcome line without one", () => {
    const target = mount(false);

    expect(target.textContent).not.toContain(NOTICE_TEXT);
  });
});
