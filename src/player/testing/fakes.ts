import type { Size } from "../ken-burns";
import type {
  Clock,
  FrameScheduler,
  MusicPlayback,
  PictureLoader,
  PreparedSlide,
  RenderFrame,
  SlideRenderer,
} from "../ports";

export interface FakePicture extends Size {
  readonly src: string;
}

export class FakeClock implements Clock {
  #nowMs = 1000;
  now(): number {
    return this.#nowMs;
  }
  advance(ms: number): void {
    this.#nowMs += ms;
  }
}

export class FakeFrameScheduler implements FrameScheduler {
  #pending = new Map<number, () => void>();
  #nextHandle = 1;
  request(callback: () => void): number {
    const handle = this.#nextHandle++;
    this.#pending.set(handle, callback);
    return handle;
  }
  cancel(handle: number): void {
    this.#pending.delete(handle);
  }
  get hasPendingFrame(): boolean {
    return this.#pending.size > 0;
  }
  runFrame(): void {
    const callbacks = [...this.#pending.values()];
    this.#pending.clear();
    callbacks.forEach((callback) => callback());
  }
}

interface PendingLoad {
  resolve(picture: FakePicture): void;
  reject(error: Error): void;
}

/** Loads complete only when the test says so. */
export class FakePictureLoader implements PictureLoader<FakePicture> {
  readonly requested: string[] = [];
  readonly released: string[] = [];
  readonly completed: string[] = [];
  disposed = false;
  #pending = new Map<string, PendingLoad>();
  #releaseListeners: ((src: string) => void)[] = [];

  load(src: string): Promise<FakePicture> {
    this.requested.push(src);
    return new Promise((resolve, reject) => this.#pending.set(src, { resolve, reject }));
  }
  release(picture: FakePicture): void {
    this.released.push(picture.src);
    this.#releaseListeners.splice(0).forEach((listener) => listener(picture.src));
  }
  dispose(): void {
    this.disposed = true;
  }
  nextRelease(): Promise<string> {
    return new Promise((resolve) => this.#releaseListeners.push(resolve));
  }
  complete(src: string, size: Size = { width: 1600, height: 900 }): void {
    this.#take(src).resolve({ src, ...size });
    this.completed.push(src);
  }
  fail(src: string, error: Error): void {
    this.#take(src).reject(error);
  }
  #take(src: string): PendingLoad {
    const pending = this.#pending.get(src);
    if (pending === undefined) {
      throw new Error(`no pending load for ${src}; requested: ${this.requested.join(", ")}`);
    }
    this.#pending.delete(src);
    return pending;
  }
}

/**
 * What drawing costs, charged to a `FakeClock`: drawing a picture not prepared yet costs a whole
 * upload, each `prepare` one slice of it.
 */
export interface FakeRenderCosts {
  readonly clock: FakeClock;
  readonly fullUploadMs: number;
  readonly sliceMs: number;
  readonly slicesPerPicture: number;
}

export class FakeRenderer implements SlideRenderer<FakePicture> {
  readonly frames: RenderFrame<FakePicture>[] = [];
  readonly forgotten: string[] = [];
  readonly prepared: PreparedSlide<FakePicture>[] = [];
  disposed = false;
  captionInset = 0;
  /** Runs at the start of every `render`, before its cost is charged. */
  onRender: (() => void) | null = null;
  readonly #costs: FakeRenderCosts | null;
  readonly #slicesDone = new Map<string, number>();

  constructor(costs: FakeRenderCosts | null = null) {
    this.#costs = costs;
  }

  render(frame: RenderFrame<FakePicture>): void {
    this.onRender?.();
    this.frames.push(frame);
    const layers = frame.kind === "slide" ? [frame.slide] : [frame.from, frame.to];
    for (const { picture } of layers) {
      if (this.#costs !== null && !this.#isPrepared(picture)) {
        this.#costs.clock.advance(this.#costs.fullUploadMs);
        this.#slicesDone.set(picture.src, this.#costs.slicesPerPicture);
      }
    }
  }
  prepare(slide: PreparedSlide<FakePicture>): void {
    this.prepared.push(slide);
    if (this.#costs !== null && !this.#isPrepared(slide.picture)) {
      this.#costs.clock.advance(this.#costs.sliceMs);
      this.#slicesDone.set(slide.picture.src, (this.#slicesDone.get(slide.picture.src) ?? 0) + 1);
    }
  }
  setCaptionInset(cssPixels: number): void {
    this.captionInset = cssPixels;
  }
  forget(picture: FakePicture): void {
    this.forgotten.push(picture.src);
    this.#slicesDone.delete(picture.src);
  }
  dispose(): void {
    this.disposed = true;
  }
  get lastFrame(): RenderFrame<FakePicture> | undefined {
    return this.frames.at(-1);
  }
  #isPrepared(picture: FakePicture): boolean {
    return (this.#slicesDone.get(picture.src) ?? 0) >= (this.#costs?.slicesPerPicture ?? 0);
  }
}

export class FakeMusic implements MusicPlayback {
  readonly calls: string[] = [];
  /** The last volume set; kept apart from `calls`, which it would flood once per frame. */
  volume: number | undefined;
  #refusal: Error | null = null;
  refuseNextPlay(error: Error): void {
    this.#refusal = error;
  }
  play(atSeconds: number): Promise<void> {
    this.calls.push(`play@${atSeconds}`);
    const refusal = this.#refusal;
    this.#refusal = null;
    return refusal ? Promise.reject(refusal) : Promise.resolve();
  }
  setVolume(volume: number): void {
    this.volume = volume;
  }
  pause(): void {
    this.calls.push("pause");
  }
  dispose(): void {
    this.calls.push("dispose");
  }
}
