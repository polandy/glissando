import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../testing/fake-scheduler";
import { TOAST_DURATION_MS, Toaster, type ToastMessage } from "./toaster";

const SAVED: ToastMessage = { text: "Diashow erstellt", tone: "info" };

function setUp() {
  const scheduler = new FakeScheduler();
  return { scheduler, toaster: new Toaster(scheduler) };
}

describe("Toaster", () => {
  it("shows the toast it is given", () => {
    const { toaster } = setUp();

    toaster.show(SAVED);

    expect(toaster.current).toEqual(SAVED);
  });

  it("keeps a toast for six seconds, then dismisses it", () => {
    const { scheduler, toaster } = setUp();
    toaster.show(SAVED);

    scheduler.advance(TOAST_DURATION_MS - 1);
    expect(toaster.current).toEqual(SAVED);
    scheduler.advance(1);
    expect(toaster.current).toBeNull();
    expect(TOAST_DURATION_MS).toBe(6000);
  });

  it("replaces the shown toast and gives the new one its full six seconds", () => {
    const { scheduler, toaster } = setUp();
    const music: ToastMessage = { text: "Musik konnte nicht gelesen werden", tone: "error" };
    toaster.show(SAVED);
    scheduler.advance(TOAST_DURATION_MS - 1);

    toaster.show(music);
    scheduler.advance(TOAST_DURATION_MS - 1);

    expect(toaster.current).toEqual(music);
  });

  it("dismisses on ✕ and forgets the pending timeout", () => {
    const { scheduler, toaster } = setUp();
    toaster.show(SAVED);

    toaster.dismiss();

    expect(toaster.current).toBeNull();
    expect(scheduler.pending).toBe(0);
  });

  it("runs the action once and dismisses the toast", () => {
    const { scheduler, toaster } = setUp();
    let retries = 0;
    toaster.show({ ...SAVED, action: { label: "Erneut", run: () => (retries += 1) } });

    toaster.act();

    expect(retries).toBe(1);
    expect(toaster.current).toBeNull();
    expect(scheduler.pending).toBe(0);
  });

  it("keeps a toast the action itself shows", () => {
    const { toaster } = setUp();
    const followUp: ToastMessage = { text: "Gleiches Ergebnis", tone: "error" };
    toaster.show({ ...SAVED, action: { label: "Erneut", run: () => toaster.show(followUp) } });

    toaster.act();

    expect(toaster.current).toEqual(followUp);
  });

  it("tells subscribers about every change", () => {
    const { scheduler, toaster } = setUp();
    const seen: (ToastMessage | null)[] = [];
    toaster.subscribe((toast) => seen.push(toast));

    toaster.show(SAVED);
    scheduler.advance(TOAST_DURATION_MS);

    expect(seen).toEqual([SAVED, null]);
  });
});
