import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { createMemoryStorage } from "../testing/memory-storage";
import { createTranslator } from "../i18n/translator";
import { Toaster } from "../toast/toaster";
import { createStorageFrameCardPreference, FrameCardPreference } from "./frame-card-preference";
import { hideFrameCard } from "./frame-card-actions";

function setUp() {
  const preference = new FrameCardPreference(
    createStorageFrameCardPreference(createMemoryStorage()),
  );
  const toaster = new Toaster(new FakeScheduler());
  const { t } = createTranslator("en");
  return { preference, toaster, hide: () => hideFrameCard({ preference, toaster, t }) };
}

describe("hideFrameCard", () => {
  it("hides the card and tells where to bring it back, with an undo", () => {
    const { preference, toaster, hide } = setUp();

    hide();

    expect(preference.shown).toBe(false);
    expect(toaster.current?.text).toBe("Picture frame hidden. Bring it back in Settings.");
    expect(toaster.current?.action?.label).toBe("Undo");
  });

  it("brings the card back when the toast's undo is used", () => {
    const { preference, toaster, hide } = setUp();
    hide();

    toaster.act();

    expect(preference.shown).toBe(true);
  });

  it("keeps the card hidden when the toast leaves without undo", () => {
    const { preference, toaster, hide } = setUp();
    hide();

    toaster.dismiss();

    expect(toaster.current).toBeNull();
    expect(preference.shown).toBe(false);
  });
});
