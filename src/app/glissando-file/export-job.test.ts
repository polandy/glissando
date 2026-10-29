import { describe, expect, it } from "vitest";
import type { StoredSlideshow } from "../../library/stored-slideshow";
import { entryTexts } from "../../glissando-file/testing/glissando-fixtures";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import type { ToastMessage } from "../toast/toaster";
import { ExportJob, type ExportJobPorts, type ExportProgress } from "./export-job";

const SHOW: StoredSlideshow = {
  id: "show-1",
  title: "Herbst: in Wien",
  createdAt: "2025-10-01T08:00:00.000Z",
  pictures: [
    {
      id: "p1",
      capturedAt: "2025-09-30T10:00:00Z",
      width: 4,
      height: 3,
      fileName: "a.jpg",
      colours: { veil: "#404040", accent: "#C0C0C0" },
    },
  ],
  songs: [],
  secondsPerPicture: 5,
};

const playerPageFor = (slideshow: StoredSlideshow) =>
  `<!doctype html><title>${slideshow.title}</title>`;

async function setUp(
  wrap: (store: MemoryLibraryStore) => ExportJobPorts["store"] = (store) => store,
) {
  const store = new MemoryLibraryStore();
  await store.putPicture("p1", {
    display: new Blob(["display"], { type: "image/jpeg" }),
    thumbnail: new Blob(["thumb"], { type: "image/jpeg" }),
  });
  await store.saveSlideshow(SHOW);
  const downloads: { file: Blob; fileName: string }[] = [];
  const toasts: ToastMessage[] = [];
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  const job = new ExportJob({
    store: wrap(store),
    download: (file, fileName) => downloads.push({ file, fileName }),
    toaster: { show: (toast) => toasts.push(toast) },
    reportError: (error) => errors.push(error),
    log: (error) => logged.push(error),
    now: () => new Date("2026-01-01T00:00:00Z"),
    downloadedText: (fileName, bytes) => `${fileName} downloaded · ${bytes}`,
    failedText: () => "Export failed",
    tryAgainLabel: () => "Try again",
    playerPage: async (slideshow) => playerPageFor(slideshow),
  });
  const states: (ExportProgress | null)[] = [];
  job.subscribe((state) => states.push(state));
  return { store, job, downloads, toasts, errors, logged, states };
}

describe("ExportJob", () => {
  it("downloads the slideshow as a file named after its title and says so with the size", async () => {
    const { job, downloads, toasts } = await setUp();

    await job.start("show-1");

    expect(downloads.map((download) => download.fileName)).toEqual(["Herbst- in Wien.glissando"]);
    const size = downloads[0]?.file.size;
    expect(toasts).toEqual([
      { text: `Herbst- in Wien.glissando downloaded · ${size}`, tone: "info" },
    ]);
  });

  it("puts the player page built for the slideshow into the file", async () => {
    const { job, downloads } = await setUp();

    await job.start("show-1");

    const file = downloads[0]?.file ?? new Blob();
    expect((await entryTexts(file))["index.html"]).toBe(playerPageFor(SHOW));
  });

  it("exports from the store it is given, such as a server slideshow's, over its own", async () => {
    const { job, downloads } = await setUp();
    const server = new MemoryLibraryStore();
    await server.putPicture("p1", {
      display: new Blob(["display"], { type: "image/jpeg" }),
      thumbnail: new Blob(["thumb"], { type: "image/jpeg" }),
    });
    await server.saveSlideshow({ ...SHOW, id: "on-server", title: "Server" });

    await job.start("on-server", server);

    expect(downloads.map((download) => download.fileName)).toEqual(["Server.glissando"]);
  });

  it("publishes its progress with the slideshow's title while it runs, then nothing", async () => {
    const { job, states } = await setUp();

    await job.start("show-1");

    expect(states[0]).toBeNull();
    expect(states[1]).toEqual({ slideshowId: "show-1", title: "Herbst: in Wien", fraction: 0 });
    expect(states.at(-2)).toEqual({ slideshowId: "show-1", title: "Herbst: in Wien", fraction: 1 });
    expect(states.at(-1)).toBeNull();
  });

  it("runs one export at a time: a start while one runs does nothing", async () => {
    const { job, downloads } = await setUp();

    const first = job.start("show-1");
    const second = job.start("show-1");
    await Promise.all([first, second]);

    expect(downloads).toHaveLength(1);
  });

  it("resolves a start with how the export ended: saved, or failed", async () => {
    const { job } = await setUp();

    expect(await job.start("show-1")).toBe("saved");
    expect(await job.start("no-such-show")).toBe("failed");
  });

  it("resolves a start while one runs with the running export's outcome", async () => {
    const { job } = await setUp();

    const first = job.start("show-1");
    const second = job.start("no-such-show");

    expect(await second).toBe(await first);
  });

  it.each([
    ["storage runs full", new DOMException("full", "QuotaExceededError")],
    ["memory runs out", new RangeError("Array buffer allocation failed")],
  ])("when %s, offers to try again in an error toast and logs the cause", async (_, cause) => {
    let fail = true;
    const { job, downloads, toasts, errors, logged } = await setUp((store) => ({
      ...pick(store),
      pictureBlob: (id) => {
        if (fail) {
          fail = false;
          return Promise.reject(cause);
        }
        return store.pictureBlob(id);
      },
    }));

    expect(await job.start("show-1")).toBe("failed");

    expect(toasts).toEqual([expect.objectContaining({ text: "Export failed", tone: "error" })]);
    expect(logged).toEqual([cause]);
    expect(errors).toEqual([]);
    expect(job.running).toBeNull();
    toasts[0]?.action?.run();
    await job.settled();
    expect(downloads).toHaveLength(1);
  });

  it("reports any other failure as unexpected, without an export toast", async () => {
    const { job, toasts, errors } = await setUp();

    await job.start("no-such-show");

    expect(errors).toHaveLength(1);
    expect(toasts).toEqual([]);
    expect(job.running).toBeNull();
  });
});

function pick(store: MemoryLibraryStore): ExportJobPorts["store"] {
  return {
    getSlideshow: (id) => store.getSlideshow(id),
    pictureBlob: (id) => store.pictureBlob(id),
    thumbnailBlob: (id) => store.thumbnailBlob(id),
    musicBlob: (id) => store.musicBlob(id),
    videoBlob: (id) => store.videoBlob(id),
  };
}
