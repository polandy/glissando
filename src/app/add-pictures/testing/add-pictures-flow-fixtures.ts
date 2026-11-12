import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { slideshow } from "../../../library/testing/library-store-contract";
import { refusalToast } from "../../editing/edit-refusal";
import { createTranslator } from "../../i18n/translator";
import type { Route } from "../../navigation/route";
import type { SlideshowHome } from "../../routes/slideshow-storage";
import type { ToastMessage } from "../../toast/toaster";
import { AddPicturesFlow, type AddPicturesFlowState } from "../add-pictures-flow";

export const GONE_TEXT = "This slideshow no longer exists.";
export const SHOW_1 = slideshow({ id: "s1" });
export const SHOW_2 = slideshow({ id: "s2" });

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
  /** The files `addPictures` was handed, by name. */
  readonly addedFiles: string[] = [];
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

  addPictures(files: readonly File[]): void {
    this.addedFiles.push(...files.map(({ name }) => name));
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

export function setUp() {
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

export async function committing(ids: readonly string[]) {
  const setup = setUp();
  setup.flow.open(SHOW_1, "device");
  const commit = setup.flow.commit();
  setup.sessions[0]?.committed(ids);
  await commit;
  return setup;
}
