import type { Size } from "../ken-burns";
import type {
  Clock,
  FrameScheduler,
  MusicPlayback,
  PictureLoader,
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
  nextRelease(): Promise<string> {
    return new Promise((resolve) => this.#releaseListeners.push(resolve));
  }
  complete(src: string, size: Size = { width: 1600, height: 900 }): void {
    this.#take(src).resolve({ src, ...size });
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

export class FakeRenderer implements SlideRenderer<FakePicture> {
  readonly frames: RenderFrame<FakePicture>[] = [];
  readonly forgotten: string[] = [];
  disposed = false;
  captionInset = 0;
  render(frame: RenderFrame<FakePicture>): void {
    this.frames.push(frame);
  }
  setCaptionInset(cssPixels: number): void {
    this.captionInset = cssPixels;
  }
  forget(picture: FakePicture): void {
    this.forgotten.push(picture.src);
  }
  dispose(): void {
    this.disposed = true;
  }
  get lastFrame(): RenderFrame<FakePicture> | undefined {
    return this.frames.at(-1);
  }
}

export class FakeMusic implements MusicPlayback {
  readonly calls: string[] = [];
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
  pause(): void {
    this.calls.push("pause");
  }
  dispose(): void {
    this.calls.push("dispose");
  }
}
