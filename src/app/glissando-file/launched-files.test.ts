import { describe, expect, it } from "vitest";
import { openLaunchedFiles, type LaunchConsumer, type LaunchQueue } from "./launched-files";

class FakeLaunchQueue implements LaunchQueue {
  consumer: LaunchConsumer | null = null;
  setConsumer(consumer: LaunchConsumer): void {
    this.consumer = consumer;
  }
}

function launchedFile(name: string) {
  const file = new File(["x"], name);
  return { getFile: () => Promise.resolve(file) };
}

function setUp(queue: LaunchQueue | null) {
  const opened: string[] = [];
  const errors: unknown[] = [];
  const launch = openLaunchedFiles(queue, {
    open: (file) => {
      opened.push(file.name);
      return Promise.resolve();
    },
    reportError: (error) => errors.push(error),
  });
  return { opened, errors, launch };
}

describe("openLaunchedFiles", () => {
  it("opens a file the app was launched with", async () => {
    const queue = new FakeLaunchQueue();
    const { opened, launch } = setUp(queue);

    queue.consumer?.({ files: [launchedFile("Holiday.glissando")] });
    await launch.settled();

    expect(opened).toEqual(["Holiday.glissando"]);
  });

  it("opens several launched files one after another, in their order", async () => {
    const queue = new FakeLaunchQueue();
    const opened: string[] = [];
    let running = 0;
    let mostAtOnce = 0;
    const launch = openLaunchedFiles(queue, {
      open: async (file) => {
        running++;
        mostAtOnce = Math.max(mostAtOnce, running);
        opened.push(file.name);
        await Promise.resolve();
        await Promise.resolve();
        running--;
      },
      reportError: () => {},
    });

    queue.consumer?.({ files: [launchedFile("a.glissando"), launchedFile("b.glissando")] });
    await launch.settled();

    expect(opened).toEqual(["a.glissando", "b.glissando"]);
    expect(mostAtOnce).toBe(1);
  });

  it("opens nothing on a launch without files, an ordinary start of the app", async () => {
    const queue = new FakeLaunchQueue();
    const { opened, launch } = setUp(queue);

    queue.consumer?.({ files: [] });
    await launch.settled();

    expect(queue.consumer).not.toBeNull();
    expect(opened).toEqual([]);
  });

  it("reports a launched file that cannot be read and still opens the next", async () => {
    const queue = new FakeLaunchQueue();
    const { opened, errors, launch } = setUp(queue);
    const unreadable = new DOMException("gone", "NotFoundError");

    queue.consumer?.({
      files: [{ getFile: () => Promise.reject(unreadable) }, launchedFile("b.glissando")],
    });
    await launch.settled();

    expect(opened).toEqual(["b.glissando"]);
    expect(errors).toEqual([unreadable]);
  });

  it("does nothing in a browser without a launch queue", async () => {
    const { opened, errors, launch } = setUp(null);

    await launch.settled();

    expect(launch.listening).toBe(false);
    expect(opened).toEqual([]);
    expect(errors).toEqual([]);
  });
});
