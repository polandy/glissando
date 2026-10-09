import { describe, expect, it } from "vitest";
import type { Route } from "../navigation/route";
import type { ToastMessage } from "../toast/toaster";
import { ImportFlow, type ImportFlowState } from "./import-flow";

const CREATED_TEXT = "Slideshow created";

/** A session whose discard settles only when the test says so. */
class FakeSession {
  readonly id: number;
  #settle: { resolve: () => void; reject: (error: unknown) => void } | null = null;

  constructor(id: number) {
    this.id = id;
  }

  discard(): Promise<void> {
    return new Promise((resolve, reject) => (this.#settle = { resolve, reject }));
  }

  discarded(): void {
    this.#settle?.resolve();
  }

  failDiscard(error: unknown): void {
    this.#settle?.reject(error);
  }
}

function setUp(persistRefused: Promise<boolean> = Promise.resolve(false)) {
  const log: string[] = [];
  const opened: Route[] = [];
  const toasts: ToastMessage[] = [];
  const errors: unknown[] = [];
  const sessions: FakeSession[] = [];
  const flow = new ImportFlow<FakeSession>({
    newImportSession: () => {
      const session = new FakeSession(sessions.length + 1);
      sessions.push(session);
      return session;
    },
    deleteAbandonedMedia: () => log.push("delete abandoned media"),
    navigator: {
      open: (route) => opened.push(route),
      back: () => log.push("back"),
    },
    toaster: { show: (toast) => toasts.push(toast) },
    persistencePrompt: { afterCreate: () => persistRefused },
    focusPass: { start: () => log.push("look for focus") },
    reportError: (error) => errors.push(error),
    createdText: () => CREATED_TEXT,
  });
  const states: ImportFlowState<FakeSession>[] = [];
  flow.subscribe((state) => states.push(state));
  return { flow, log, opened, toasts, errors, sessions, states };
}

describe("ImportFlow", () => {
  it("starts one import session for the import screen and keeps it across visits", () => {
    const { flow, sessions, opened } = setUp();

    flow.open();
    flow.ensureSession();

    expect(sessions).toHaveLength(1);
    expect(flow.session).toBe(sessions[0]);
    expect(opened).toEqual([{ screen: "import", step: "pictures" }]);
  });

  it("deletes abandoned media only once the store spares the discarded import", async () => {
    const { flow, log, sessions } = setUp();
    flow.open();

    const discarding = flow.discard(false);
    expect(log).toEqual([]);
    sessions[0]?.discarded();
    await discarding;

    expect(log).toEqual(["delete abandoned media"]);
    expect(flow.session).toBe(sessions[0]);
  });

  it("forgets the session and goes back when the discard leaves the import", async () => {
    const { flow, log, sessions, states } = setUp();
    flow.open();

    const discarding = flow.discard(true);
    sessions[0]?.discarded();
    await discarding;

    expect(log).toEqual(["back", "delete abandoned media"]);
    expect(flow.session).toBeNull();
    expect(states.at(-1)?.session).toBeNull();
  });

  it("reports a failed discard and leaves the media alone", async () => {
    const { flow, log, errors, sessions } = setUp();
    flow.open();
    const failure = new Error("the store is closed");

    const discarding = flow.discard(false);
    sessions[0]?.failDiscard(failure);
    await discarding;

    expect(errors).toEqual([failure]);
    expect(log).toEqual([]);
  });

  it("after creating: forgets the session, cleans up, opens the slideshow and confirms", async () => {
    const { flow, log, opened, toasts, sessions } = setUp();
    flow.open();

    await flow.created("show-1");

    expect(sessions).toHaveLength(1);
    expect(flow.session).toBeNull();
    expect(log).toEqual(["delete abandoned media", "look for focus"]);
    expect(opened.at(-1)).toEqual({ screen: "slideshow", slideshowId: "show-1" });
    expect(toasts).toEqual([{ text: CREATED_TEXT, tone: "info" }]);
  });

  it("looks for the focus of a slideshow created from a file", async () => {
    const { flow, log } = setUp();

    await flow.afterCreate();

    expect(log).toEqual(["look for focus"]);
  });

  it("shows the persistence notice when the browser refused persistent storage after creating", async () => {
    const { flow, states } = setUp(Promise.resolve(true));

    await flow.created("show-1");
    expect(flow.persistRefused).toBe(true);
    expect(states.at(-1)?.persistRefused).toBe(true);

    flow.dismissPersistNotice();
    expect(flow.persistRefused).toBe(false);
  });

  it("shows no persistence notice when storage is persistent", async () => {
    const { flow } = setUp(Promise.resolve(false));

    await flow.created("show-1");

    expect(flow.persistRefused).toBe(false);
  });

  it("reports a failed persistence request", async () => {
    const failure = new Error("storage manager unavailable");
    const { flow, errors, opened } = setUp(Promise.reject(failure));

    await flow.created("show-1");

    expect(opened.at(-1)).toEqual({ screen: "slideshow", slideshowId: "show-1" });
    expect(errors).toEqual([failure]);
    expect(flow.persistRefused).toBe(false);
  });
});
