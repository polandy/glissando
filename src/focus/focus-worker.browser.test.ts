import { afterEach, describe, expect, it } from "vitest";
import astronautJpegUrl from "./testing/astronaut-128.jpg?url";
import blankJpegUrl from "./testing/blank-128.jpg?url";
import {
  FocusDetectionError,
  startFocusWorker,
  WorkerFocusDetector,
} from "./worker-focus-detector";

/** astronaut-128.jpg: NASA's public-domain portrait of Eileen Collins, as in find-focus.test.ts. */
async function thumbnail(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

const workers: Worker[] = [];

function detector(): WorkerFocusDetector {
  return new WorkerFocusDetector(() => {
    const worker = startFocusWorker();
    workers.push(worker);
    return worker;
  });
}

afterEach(() => {
  for (const worker of workers.splice(0)) worker.terminate();
});

describe("the focus worker", () => {
  it("finds the face in a portrait thumbnail", async () => {
    const focus = await detector().detect(await thumbnail(astronautJpegUrl));

    expect(focus.kind).toBe("subject");
  });

  it("finds nothing in a blank thumbnail", async () => {
    const focus = await detector().detect(await thumbnail(blankJpegUrl));

    expect(focus).toEqual({ kind: "none" });
  });

  it("reports a thumbnail it cannot decode, and keeps working", async () => {
    const focusDetector = detector();

    await expect(focusDetector.detect(new Blob(["not a picture"]))).rejects.toThrow(
      FocusDetectionError,
    );
    await expect(focusDetector.detect(await thumbnail(blankJpegUrl))).resolves.toEqual({
      kind: "none",
    });
  });
});
