import { describe, expect, it } from "vitest";
import { exportedFile, zipWith } from "../../glissando-file/testing/glissando-fixtures";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { Route } from "../navigation/route";
import type { ToastMessage } from "../toast/toaster";
import { OpenFlow, type OpenFlowPorts, type OpenFlowState } from "./open-flow";

const MEDIA_BYTES = 51;

async function setUp(change: Partial<OpenFlowPorts> = {}) {
  const store = new MemoryLibraryStore();
  const opened: Route[] = [];
  const toasts: ToastMessage[] = [];
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  let created = 0;
  let next = 0;
  const flow = new OpenFlow({
    store,
    newId: () => `new-${++next}`,
    now: () => new Date("2026-01-02T03:04:05Z"),
    freeBytes: () => Promise.resolve(1e9),
    navigator: { open: (route) => opened.push(route) },
    toaster: { show: (toast) => toasts.push(toast) },
    reportError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    afterCreate: () => created++,
    openedText: (title) => `opened ${title}`,
    openedAsText: (title, original) => `opened as ${title}, ${original} unchanged`,
    cancelledText: () => "cancelled",
    ...change,
  });
  const states: OpenFlowState[] = [];
  flow.subscribe((state) => states.push(state));
  return { store, flow, opened, toasts, errors, logged, states, created: () => created };
}

const glissando = async (name = "Herbst in Wien.glissando"): Promise<File> =>
  new File([await exportedFile()], name);

const existing: StoredSlideshow = {
  id: "other",
  title: "Herbst in Wien",
  createdAt: "2025-01-01T00:00:00Z",
  pictures: [
    { id: "kept", capturedAt: "2025-01-01T00:00:00Z", width: 1, height: 1, fileName: "k" },
  ],
  secondsPerPicture: 5,
};

describe("OpenFlow", () => {
  it("opens a file as a new slideshow, shows it and says so", async () => {
    const { store, flow, opened, toasts, created } = await setUp();

    await flow.open(await glissando(), "library");

    const [show] = await store.listSlideshows();
    expect(opened).toEqual([{ screen: "slideshow", slideshowId: show?.id }]);
    expect(toasts).toEqual([{ text: "opened Herbst in Wien", tone: "info" }]);
    expect(created()).toBe(1);
    expect(flow.state).toEqual({ opening: null, notice: null });
  });

  it("shows checking, then each picture of the count, then the music, under the file's name", async () => {
    const { flow, states } = await setUp();

    await flow.open(await glissando(), "library");

    const lines = states.flatMap((state) => (state.opening ? [state.opening.line] : []));
    expect(lines[0]).toEqual({ kind: "checking" });
    expect(lines.filter((line) => line.kind !== "checking")).toEqual([
      { kind: "picture", number: 1, count: 2 },
      { kind: "picture", number: 2, count: 2 },
      { kind: "music" },
    ]);
    const fractions = states.flatMap((state) => (state.opening ? [state.opening.fraction] : []));
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
    expect(states.find((state) => state.opening)?.opening?.fileName).toBe(
      "Herbst in Wien.glissando",
    );
  });

  it("names a clashing copy and says the other slideshow stays unchanged", async () => {
    const { store, flow, toasts } = await setUp();
    await store.saveSlideshow(existing);

    await flow.open(await glissando(), "library");

    expect(toasts).toEqual([
      { text: "opened as Herbst in Wien (2), Herbst in Wien unchanged", tone: "info" },
    ]);
    expect((await store.getSlideshow("other")).title).toBe("Herbst in Wien");
  });

  it.each([
    ["foreign", async () => new File(["\xff\xd8 photo"], "urlaub.jpg")],
    [
      "newer",
      async () =>
        new File(
          [await zipWith({ "glissando.json": '{"format":"glissando","formatVersion":9}' })],
          "x.glissando",
        ),
    ],
    ["damaged", async () => new File([(await exportedFile()).slice(0, -30)], "x.glissando")],
  ])("refuses a %s file with a notice where it was opened, writing nothing", async (kind, file) => {
    const { store, flow, opened } = await setUp();
    const chosen = await file();

    await flow.open(chosen, "pictures");

    expect(flow.state.notice).toEqual({
      origin: "pictures",
      fileName: chosen.name,
      problem: { kind },
    });
    expect(flow.state.opening).toBeNull();
    expect(opened).toEqual([]);
    expect(await store.listSlideshows()).toEqual([]);
  });

  it("logs why a damaged file was refused", async () => {
    const { flow, logged } = await setUp();
    await flow.open(new File([(await exportedFile()).slice(0, -30)], "x.glissando"), "library");
    expect(logged).toHaveLength(1);
  });

  it("refuses a file larger than the free space with both sizes", async () => {
    const { flow } = await setUp({ freeBytes: () => Promise.resolve(10) });

    await flow.open(await glissando(), "library");

    expect(flow.state.notice?.problem).toEqual({
      kind: "tooLarge",
      neededBytes: MEDIA_BYTES,
      freeBytes: 10,
    });
  });

  it("when storage runs full while writing, removes what it wrote and shows the sizes", async () => {
    const store = new MemoryLibraryStore();
    const quota = new DOMException("full", "QuotaExceededError");
    const { flow, logged, errors } = await setUp({
      store: Object.assign(store, { putMusic: () => Promise.reject(quota) }),
      freeBytes: () => Promise.resolve(1e9),
    });

    await flow.open(await glissando(), "library");

    expect(flow.state.notice?.problem).toEqual({
      kind: "tooLarge",
      neededBytes: MEDIA_BYTES,
      freeBytes: 1e9,
    });
    expect(logged).toEqual([quota]);
    expect(errors).toEqual([]);
    expect(await store.listSlideshows()).toEqual([]);
  });

  it("cancelled, writes nothing and says so", async () => {
    const { store, flow, toasts, opened } = await setUp();
    await store.saveSlideshow(existing);
    flow.subscribe((state) => {
      if (state.opening?.line.kind === "picture" && state.opening.line.number === 2) {
        flow.cancel();
      }
    });

    await flow.open(await glissando(), "library");

    expect(toasts).toEqual([{ text: "cancelled", tone: "info" }]);
    expect((await store.listSlideshows()).map((show) => show.id)).toEqual(["other"]);
    expect(opened).toEqual([]);
    expect(flow.state).toEqual({ opening: null, notice: null });
  });

  it("reports any other failure as unexpected", async () => {
    const store = new MemoryLibraryStore();
    const broken = new Error("disk on fire");
    const { flow, errors } = await setUp({
      store: Object.assign(store, { saveSlideshow: () => Promise.reject(broken) }),
    });

    await flow.open(await glissando(), "library");

    expect(errors).toEqual([broken]);
    expect(flow.state).toEqual({ opening: null, notice: null });
  });

  it("clears its notice when dismissed and when another file is opened", async () => {
    const { flow } = await setUp();
    await flow.open(new File(["no zip"], "a.txt"), "library");
    expect(flow.state.notice).not.toBeNull();
    flow.dismissNotice();
    expect(flow.state.notice).toBeNull();

    await flow.open(new File(["no zip"], "a.txt"), "library");
    const opening = flow.open(await glissando(), "library");
    expect(flow.state.notice).toBeNull();
    await opening;
  });

  it("opens one file at a time: another while one opens is ignored", async () => {
    const { flow, store } = await setUp();

    const first = flow.open(await glissando(), "library");
    const second = flow.open(new File(["no zip"], "a.txt"), "library");
    await Promise.all([first, second]);

    expect(await store.listSlideshows()).toHaveLength(1);
    expect(flow.state.notice).toBeNull();
  });
});
