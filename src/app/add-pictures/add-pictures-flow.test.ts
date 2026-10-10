import { describe, expect, it } from "vitest";
import { SlideshowNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { slideshow } from "../../library/testing/library-store-contract";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import { SlideshowChangedError } from "../../server-library/server-slideshow-store";
import { refusalToast } from "../editing/edit-refusal";
import { createTranslator } from "../i18n/translator";
import type { Route } from "../navigation/route";
import type { SlideshowHome } from "../routes/slideshow-storage";
import type { ToastMessage } from "../toast/toaster";
import { AddPicturesFlow, type AddPicturesFlowState } from "./add-pictures-flow";

const GONE_TEXT = "This slideshow no longer exists.";
const SHOW_1 = slideshow({ id: "s1" });
const SHOW_2 = slideshow({ id: "s2" });

/** Settles when the test says so, whether before or after the flow asks. */
class Deferred<T> {
  resolve: (value: T) => void = () => undefined;
  reject: (error: unknown) => void = () => undefined;
  readonly promise = new Promise<T>((resolve, reject) => {
    this.resolve = resolve;
    this.reject = reject;
  });
}

/** A session whose discard and commit settle only when the test says so. */
class FakeSession {
  readonly slideshowId: string;
  readonly home: SlideshowHome;
  /** The records `refresh` was handed, by title. */
  readonly refreshedWith: string[] = [];
  discardCalls = 0;
  readonly #discard = new Deferred<void>();
  readonly #commit = new Deferred<readonly string[]>();

  constructor(slideshowId: string, home: SlideshowHome) {
    this.slideshowId = slideshowId;
    this.home = home;
  }

  refresh(slideshow: StoredSlideshow): void {
    this.refreshedWith.push(slideshow.title);
  }

  discard(): Promise<void> {
    this.discardCalls += 1;
    return this.#discard.promise;
  }

  discarded(): void {
    this.#discard.resolve();
  }

  failDiscard(error: unknown): void {
    this.#discard.reject(error);
  }

  commit(): Promise<readonly string[]> {
    return this.#commit.promise;
  }

  committed(ids: readonly string[]): void {
    this.#commit.resolve(ids);
  }

  failCommit(error: unknown): void {
    this.#commit.reject(error);
  }
}

function setUp() {
  const log: string[] = [];
  const opened: Route[] = [];
  const toasts: ToastMessage[] = [];
  const errors: unknown[] = [];
  const sessions: FakeSession[] = [];
  const flow = new AddPicturesFlow<FakeSession>({
    newSession: (opening, home) => {
      const session = new FakeSession(opening.id, home);
      sessions.push(session);
      return session;
    },
    deleteAbandonedMedia: () => log.push("delete abandoned media"),
    navigator: {
      open: (route) => opened.push(route),
      back: () => log.push("back"),
    },
    toaster: { show: (toast) => toasts.push(toast) },
    focusPass: { start: () => log.push("look for focus") },
    reportError: (error) => errors.push(error),
    goneText: () => GONE_TEXT,
    refusalToast: (reason) => refusalToast(reason, createTranslator("en")),
  });
  const states: AddPicturesFlowState<FakeSession>[] = [];
  flow.subscribe((state) => states.push(state));
  return { flow, log, opened, toasts, errors, sessions, states };
}

async function committing(ids: readonly string[]) {
  const setup = setUp();
  setup.flow.open(SHOW_1, "device");
  const commit = setup.flow.commit();
  setup.sessions[0]?.committed(ids);
  await commit;
  return setup;
}

describe("AddPicturesFlow", () => {
  it("opens the add screen with one session per slideshow, kept across visits", () => {
    const { flow, sessions, opened } = setUp();

    flow.open(SHOW_1, "device");
    flow.open(SHOW_1, "device");

    expect(sessions).toHaveLength(1);
    expect(flow.session).toBe(sessions[0]);
    expect(opened).toEqual([
      { screen: "add", slideshowId: "s1" },
      { screen: "add", slideshowId: "s1" },
    ]);
  });

  it("opens the session for where the slideshow lives", () => {
    const { flow, sessions } = setUp();

    flow.open(SHOW_1, "server");

    expect(sessions.map(({ home }) => home)).toEqual(["server"]);
  });

  it("reopening the same slideshow hands its session the record as stored now", () => {
    const { flow, sessions } = setUp();
    flow.open(SHOW_1, "device");

    flow.open({ ...SHOW_1, title: "Renamed" }, "device");

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.refreshedWith).toEqual(["Renamed"]);
  });

  it("ignores a discard while the pictures are being added, and navigates once", async () => {
    const { flow, sessions, log, opened } = setUp();
    flow.open(SHOW_1, "device");
    const commit = flow.commit();
    expect(flow.committing).toBe(true);

    void flow.discard(true);
    sessions[0]?.committed(["p1"]);
    await commit;

    expect(flow.committing).toBe(false);
    expect(flow.added).toEqual({ slideshowId: "s1", pictureIds: ["p1"] });
    expect(opened).toEqual([
      { screen: "add", slideshowId: "s1" },
      { screen: "slideshow", slideshowId: "s1" },
    ]);
    expect(log).toEqual(["delete abandoned media", "look for focus"]);
    expect(sessions[0]?.discardCalls).toBe(0);
  });

  it("discards the selection for another slideshow when adding to a new one, then cleans up", async () => {
    const { flow, sessions, log } = setUp();
    flow.open(SHOW_1, "device");

    flow.open(SHOW_2, "device");
    expect(flow.session?.slideshowId).toBe("s2");
    expect(log).toEqual([]);
    sessions[0]?.discarded();
    await flow.settled();

    expect(log).toEqual(["delete abandoned media"]);
  });

  it("discarding leaves for the slideshow and deletes the media once the store spares it", async () => {
    const { flow, log, sessions } = setUp();
    flow.open(SHOW_1, "device");

    const discarding = flow.discard(true);
    expect(flow.session).toBeNull();
    expect(log).toEqual(["back"]);
    sessions[0]?.discarded();
    await discarding;

    expect(log).toEqual(["back", "delete abandoned media"]);
  });

  it("reports a failed discard instead of cleaning up", async () => {
    const { flow, log, sessions, errors } = setUp();
    flow.open(SHOW_1, "device");
    const failure = new Error("release failed");

    const discarding = flow.discard(false);
    sessions[0]?.failDiscard(failure);
    await discarding;

    expect(errors).toEqual([failure]);
    expect(log).toEqual([]);
  });

  it("after adding returns to the slideshow, hands it the new ids and looks for their focus", async () => {
    const { flow, opened, log } = await committing(["p1", "p2"]);

    expect(flow.session).toBeNull();
    expect(flow.added).toEqual({ slideshowId: "s1", pictureIds: ["p1", "p2"] });
    expect(opened.at(-1)).toEqual({ screen: "slideshow", slideshowId: "s1" });
    expect(log).toContain("look for focus");
  });

  it("keeps the new ids in the slideshow's editors and forgets them once it is left", async () => {
    const { flow } = await committing(["p1"]);

    flow.follow({ screen: "picture", slideshowId: "s1", pictureId: "p1" });
    flow.follow({ screen: "slideshow", slideshowId: "s1" });
    expect(flow.added?.pictureIds).toEqual(["p1"]);
    flow.follow({ screen: "start" });

    expect(flow.added).toBeNull();
  });

  it("a slideshow deleted meanwhile leaves with a toast and discards the new media", async () => {
    const { flow, sessions, log, toasts, errors } = setUp();
    flow.open(SHOW_1, "device");

    const commit = flow.commit();
    sessions[0]?.failCommit(new SlideshowNotFoundError("s1"));
    sessions[0]?.discarded();
    await commit;

    expect(flow.session).toBeNull();
    expect(flow.added).toBeNull();
    expect(toasts).toEqual([{ text: GONE_TEXT, tone: "info" }]);
    expect(log).toEqual(["back", "delete abandoned media"]);
    expect(errors).toEqual([]);
  });

  it("reports any other failure to add and keeps the selection", async () => {
    const { flow, sessions, errors } = setUp();
    flow.open(SHOW_1, "device");
    const failure = new Error("store failed");

    const commit = flow.commit();
    sessions[0]?.failCommit(failure);
    await commit;

    expect(errors).toEqual([failure]);
    expect(flow.session).toBe(sessions[0]);
  });

  it("a stale revision adds nothing, shows the current version and says it changed elsewhere", async () => {
    const { flow, sessions, toasts, errors, opened } = setUp();
    flow.open(SHOW_1, "server");

    const commit = flow.commit();
    sessions[0]?.failCommit(new SlideshowChangedError({ ...SHOW_1, title: "Renamed elsewhere" }));
    await commit;

    expect(flow.session).toBe(sessions[0]);
    expect(sessions[0]?.refreshedWith).toEqual(["Renamed elsewhere"]);
    expect(toasts).toEqual([
      { text: "Changed on another device. Showing the latest version.", tone: "info" },
    ]);
    expect(flow.committing).toBe(false);
    expect(opened).toEqual([{ screen: "add", slideshowId: "s1" }]);
    expect(errors).toEqual([]);
  });

  it("a server out of reach adds nothing, keeps the selection and says it couldn't save", async () => {
    const { flow, sessions, toasts, errors } = setUp();
    flow.open(SHOW_1, "server");

    const commit = flow.commit();
    sessions[0]?.failCommit(new ServerLibraryUnavailableError("PUT /api/library/slideshows/s1"));
    await commit;

    expect(flow.session).toBe(sessions[0]);
    expect(sessions[0]?.refreshedWith).toEqual([]);
    expect(toasts).toEqual([
      { text: "Couldn't save. Your Glissando server isn't answering.", tone: "error" },
    ]);
    expect(flow.committing).toBe(false);
    expect(errors).toEqual([]);
  });

  it("leaves a restored add screen or Immich browser whose selection is gone", () => {
    const { flow, log } = setUp();
    flow.open(SHOW_1, "device");

    flow.follow({ screen: "add", slideshowId: "s1" });
    flow.follow({ screen: "immich", albumId: null, slideshowId: null });
    expect(log).toEqual([]);
    flow.follow({ screen: "immich", albumId: "a1", slideshowId: "s2" });

    expect(log).toEqual(["back"]);
  });
});
