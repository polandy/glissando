import { describe, expect, it } from "vitest";
import {
  DemoSlideshowFlow,
  isDemoSlideshowVisible,
  type DemoConnectivity,
  type DemoDownloadPort,
  type DemoSlideshowFlowPorts,
} from "./demo-slideshow-flow.ts";

const DEMO_URL = "https://polandy.github.io/glissando-assets/demo/glissando-demo.glissando";
const FAILED_TEXT = "Couldn't load the demo — try again";

/** A download under the test's control: resolves, rejects or reports progress on command. */
function fakeDownload(): DemoDownloadPort & {
  readonly calls: number;
  report(received: number, total: number | null): void;
  resolve(content: string): void;
  reject(error: unknown): void;
} {
  let calls = 0;
  let report: ((received: number, total: number | null) => void) | null = null;
  let settle: ((value: Blob) => void) | null = null;
  let fail: ((error: unknown) => void) | null = null;
  return {
    get calls() {
      return calls;
    },
    download(_url, onProgress) {
      calls += 1;
      report = onProgress;
      return new Promise((resolve, reject) => {
        settle = resolve;
        fail = reject;
      });
    },
    report(received, total) {
      report?.(received, total);
    },
    resolve(content) {
      settle?.(new Blob([content]));
    },
    reject(error) {
      fail?.(error);
    },
  };
}

/** The device's connectivity, flippable from the test. */
function fakeConnectivity(online: boolean): DemoConnectivity & { setOnline(next: boolean): void } {
  let current = online;
  const listeners = new Set<(online: boolean) => void>();
  return {
    isOnline: () => current,
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setOnline(next) {
      current = next;
      for (const listener of listeners) listener(next);
    },
  };
}

interface TestPorts extends DemoSlideshowFlowPorts {
  readonly shownToasts: readonly string[];
  readonly openedFiles: readonly File[];
}

function ports(overrides: Partial<DemoSlideshowFlowPorts> = {}): TestPorts {
  const shownToasts: string[] = [];
  const openedFiles: File[] = [];
  return {
    url: DEMO_URL,
    download: fakeDownload(),
    connectivity: fakeConnectivity(true),
    openFile: (file) => openedFiles.push(file),
    toaster: { show: (toast) => shownToasts.push(toast.text) },
    failedText: () => FAILED_TEXT,
    shownToasts,
    openedFiles,
    ...overrides,
  };
}

describe("DemoSlideshowFlow", () => {
  it("starts idle, online as the connectivity port says", () => {
    expect(new DemoSlideshowFlow(ports({ connectivity: fakeConnectivity(true) })).state).toEqual({
      kind: "idle",
      online: true,
    });
    expect(new DemoSlideshowFlow(ports({ connectivity: fakeConnectivity(false) })).state).toEqual({
      kind: "idle",
      online: false,
    });
  });

  it("replays the current state to a new subscriber at once", () => {
    const flow = new DemoSlideshowFlow(ports());
    const seen: string[] = [];
    flow.subscribe((state) => seen.push(state.kind));
    expect(seen).toEqual(["idle"]);
  });

  it("ignores start() while offline", async () => {
    const download = fakeDownload();
    const flow = new DemoSlideshowFlow(ports({ download, connectivity: fakeConnectivity(false) }));
    await flow.start();
    expect(download.calls).toBe(0);
    expect(flow.state).toEqual({ kind: "idle", online: false });
  });

  it("publishes loading at once, then the download's progress", async () => {
    const download = fakeDownload();
    const flow = new DemoSlideshowFlow(ports({ download }));
    const states: unknown[] = [];
    flow.subscribe((state) => states.push(state));
    const starting = flow.start();
    download.report(10, 31);
    download.resolve("the demo file");
    await starting;
    expect(states[1]).toEqual({ kind: "loading", online: true, received: 0, total: null });
    expect(states[2]).toEqual({ kind: "loading", online: true, received: 10, total: 31 });
    expect(states.at(-1)).toEqual({ kind: "idle", online: true });
  });

  it("opens a File named glissando-demo.glissando carrying the downloaded bytes", async () => {
    const download = fakeDownload();
    const demoPorts = ports({ download });
    const flow = new DemoSlideshowFlow(demoPorts);
    const starting = flow.start();
    download.resolve("the demo file");
    await starting;
    expect(demoPorts.openedFiles).toHaveLength(1);
    expect(demoPorts.openedFiles[0]?.name).toBe("glissando-demo.glissando");
    expect(await demoPorts.openedFiles[0]?.text()).toBe("the demo file");
    expect(flow.state).toEqual({ kind: "idle", online: true });
  });

  it("shows a toast and returns to idle when the download fails, without opening a file", async () => {
    const download = fakeDownload();
    const demoPorts = ports({ download });
    const flow = new DemoSlideshowFlow(demoPorts);
    const starting = flow.start();
    download.reject(new Error("network error"));
    await starting;
    expect(flow.state).toEqual({ kind: "idle", online: true });
    expect(demoPorts.shownToasts).toEqual([FAILED_TEXT]);
    expect(demoPorts.openedFiles).toHaveLength(0);
  });

  it("ignores a second start() while one is already loading", async () => {
    const download = fakeDownload();
    const flow = new DemoSlideshowFlow(ports({ download }));
    const starting = flow.start();
    void flow.start();
    download.resolve("the demo file");
    await starting;
    expect(download.calls).toBe(1);
  });

  it("updates an idle state's online flag as connectivity changes", () => {
    const connectivity = fakeConnectivity(true);
    const flow = new DemoSlideshowFlow(ports({ connectivity }));
    connectivity.setOnline(false);
    expect(flow.state).toEqual({ kind: "idle", online: false });
  });

  it("updates a loading state's online flag as connectivity changes", () => {
    const connectivity = fakeConnectivity(true);
    const download = fakeDownload();
    const flow = new DemoSlideshowFlow(ports({ download, connectivity }));
    void flow.start();
    connectivity.setOnline(false);
    expect(flow.state).toMatchObject({ kind: "loading", online: false });
  });
});

describe("isDemoSlideshowVisible", () => {
  it.each([
    { publicInstall: true, libraryEmpty: true, visible: true },
    { publicInstall: true, libraryEmpty: false, visible: false },
    { publicInstall: false, libraryEmpty: true, visible: false },
    { publicInstall: false, libraryEmpty: false, visible: false },
  ])("is $visible for publicInstall=$publicInstall, libraryEmpty=$libraryEmpty", (c) => {
    expect(isDemoSlideshowVisible(c)).toBe(c.visible);
  });
});
