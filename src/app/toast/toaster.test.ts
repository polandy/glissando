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

  it("tells a toast it closed without its action, whether it expired, was dismissed or replaced", () => {
    const { scheduler, toaster } = setUp();
    const closed: string[] = [];
    const closing = (text: string): ToastMessage => ({
      text,
      tone: "info",
      onClosed: () => closed.push(text),
    });

    toaster.show(closing("expires"));
    scheduler.advance(TOAST_DURATION_MS);
    toaster.show(closing("dismissed"));
    toaster.dismiss();
    toaster.show(closing("replaced"));
    toaster.show(SAVED);

    expect(toaster.current).toEqual(SAVED);
    expect(closed).toEqual(["expires", "dismissed", "replaced"]);
  });

  it("does not tell a toast it closed when its action ran", () => {
    const { toaster } = setUp();
    const events: string[] = [];
    toaster.show({
      text: "Bild entfernt",
      tone: "info",
      action: { label: "Rückgängig", run: () => events.push("undone") },
      onClosed: () => events.push("closed"),
    });

    toaster.act();

    expect(toaster.current).toBeNull();
    expect(events).toEqual(["undone"]);
  });

  it("does not tell a toast it closed when it is shown again", () => {
    const { toaster } = setUp();
    let closed = 0;
    const toast: ToastMessage = {
      text: "Bild entfernt",
      tone: "info",
      onClosed: () => (closed += 1),
    };

    toaster.show(toast);
    toaster.show(toast);

    expect(toaster.current).toBe(toast);
    expect(closed).toBe(0);
  });
});
