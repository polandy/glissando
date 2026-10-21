import type { NetworkStatus } from "../../immich/immich-availability";
import {
  sampleMediaId,
  sampleTrackUrl,
  type SampleTrack,
  type SampleTrackId,
} from "../../sample-music/sample-tracks";
import type { ObjectUrlPorts } from "../media/object-urls";

/** The shared `<audio>` element `SamplePreview` plays through; the browser's `Audio` satisfies it. */
export interface SamplePreviewAudio {
  src: string;
  currentTime: number;
  play(): Promise<void>;
  pause(): void;
  addEventListener(type: "timeupdate" | "ended" | "error", listener: () => void): void;
  removeEventListener(type: "timeupdate" | "ended" | "error", listener: () => void): void;
}

/** What previewing a sample track needs (SAMPLE_MUSIC.md, Listening). */
export interface SamplePreviewPorts extends Pick<ObjectUrlPorts, "create" | "revoke"> {
  readonly baseUrl: string;
  hasMusic(id: string): Promise<boolean>;
  musicBlob(id: string): Promise<Blob>;
  readonly network: NetworkStatus;
  createAudioElement(): SamplePreviewAudio;
}

/** No track is loading or playing. */
export type SamplePreviewIdle = { readonly kind: "idle" };

export type SamplePreviewState =
  | SamplePreviewIdle
  | { readonly kind: "loading"; readonly trackId: SampleTrackId }
  | { readonly kind: "playing"; readonly trackId: SampleTrackId; readonly progress: number }
  | { readonly kind: "paused"; readonly trackId: SampleTrackId; readonly progress: number };

/** A track whose preview failed to load; delivered once, for a toast the UI chooses the words of. */
export interface SamplePreviewError {
  readonly trackId: SampleTrackId;
}

const IDLE: SamplePreviewIdle = { kind: "idle" };

/**
 * One track previewed at a time, through one shared `<audio>` element (SAMPLE_MUSIC.md,
 * Listening): a track on this device plays from its stored blob, any other streams from
 * `baseUrl`. Tapping the playing track pauses it; tapping it again resumes. A streamed preview
 * stops when the device goes offline; one playing from this device does not.
 */
export class SamplePreview {
  readonly #ports: SamplePreviewPorts;
  readonly #audio: SamplePreviewAudio;
  readonly #listeners = new Set<(state: SamplePreviewState) => void>();
  readonly #errorListeners = new Set<(error: SamplePreviewError) => void>();
  readonly #stopListeningToNetwork: () => void;
  #state: SamplePreviewState = IDLE;
  /** Bumped by every stop or new load, so a stale async result or event changes nothing. */
  #generation = 0;
  #activeTrack: SampleTrack | undefined;
  #streaming = false;
  #objectUrl: string | undefined;
  readonly #onTimeUpdate = (): void => this.#reportProgress();
  readonly #onEnded = (): void => this.#end();
  readonly #onAudioError = (): void => {
    const trackId = this.#activeTrack?.id;
    if (trackId !== undefined) this.#fail(trackId);
  };

  constructor(ports: SamplePreviewPorts) {
    this.#ports = ports;
    this.#audio = ports.createAudioElement();
    this.#audio.addEventListener("timeupdate", this.#onTimeUpdate);
    this.#audio.addEventListener("ended", this.#onEnded);
    this.#audio.addEventListener("error", this.#onAudioError);
    this.#stopListeningToNetwork = ports.network.onChange((online) => {
      if (!online && this.#streaming) this.stop();
    });
  }

  get state(): SamplePreviewState {
    return this.#state;
  }

  get network(): NetworkStatus {
    return this.#ports.network;
  }

  /** Whether `trackId` is already stored on this device, so its card need not show "Needs a connection". */
  hasTrackOnDevice(trackId: SampleTrackId): Promise<boolean> {
    return this.#ports.hasMusic(sampleMediaId(trackId));
  }

  subscribe(listener: (state: SamplePreviewState) => void): () => void {
    this.#listeners.add(listener);
    listener(this.#state);
    return () => this.#listeners.delete(listener);
  }

  /** Fires once per track whose preview could not be loaded or played. */
  onError(listener: (error: SamplePreviewError) => void): () => void {
    this.#errorListeners.add(listener);
    return () => this.#errorListeners.delete(listener);
  }

  /** Starts, pauses or resumes `track`'s preview; one already loading or playing is stopped first. */
  async toggle(track: SampleTrack): Promise<void> {
    if (this.#state.kind === "playing" && this.#state.trackId === track.id) {
      this.#audio.pause();
      this.#publish({ kind: "paused", trackId: track.id, progress: this.#progress(track) });
      return;
    }
    if (this.#state.kind === "paused" && this.#state.trackId === track.id) {
      await this.#resume(track);
      return;
    }
    await this.#start(track);
  }

  /** Stops the preview under way, if any, freeing the blob URL it held. */
  stop(): void {
    if (this.#state.kind === "idle") return;
    this.#generation += 1;
    this.#reset();
    this.#publish(IDLE);
  }

  /** Releases the audio element's listeners and the network subscription. */
  dispose(): void {
    this.stop();
    this.#audio.removeEventListener("timeupdate", this.#onTimeUpdate);
    this.#audio.removeEventListener("ended", this.#onEnded);
    this.#audio.removeEventListener("error", this.#onAudioError);
    this.#stopListeningToNetwork();
  }

  async #start(track: SampleTrack): Promise<void> {
    this.#generation += 1;
    const generation = this.#generation;
    this.#reset();
    this.#activeTrack = track;
    this.#publish({ kind: "loading", trackId: track.id });

    const mediaId = sampleMediaId(track.id);
    let onDevice: boolean;
    try {
      onDevice = await this.#ports.hasMusic(mediaId);
    } catch {
      if (generation === this.#generation) this.#fail(track.id);
      return;
    }
    if (generation !== this.#generation) return;

    if (!onDevice && !this.#ports.network.isOnline()) {
      this.#fail(track.id);
      return;
    }

    try {
      if (onDevice) {
        const blob = await this.#ports.musicBlob(mediaId);
        if (generation !== this.#generation) return;
        this.#objectUrl = this.#ports.create(blob);
        this.#audio.src = this.#objectUrl;
      } else {
        this.#streaming = true;
        this.#audio.src = sampleTrackUrl(this.#ports.baseUrl, track.id);
      }
      this.#audio.currentTime = 0;
      await this.#audio.play();
    } catch {
      if (generation === this.#generation) this.#fail(track.id);
      return;
    }
    if (generation !== this.#generation) return;
    this.#publish({ kind: "playing", trackId: track.id, progress: this.#progress(track) });
  }

  async #resume(track: SampleTrack): Promise<void> {
    const generation = this.#generation;
    try {
      await this.#audio.play();
    } catch {
      if (generation === this.#generation) this.#fail(track.id);
      return;
    }
    if (generation !== this.#generation) return;
    this.#publish({ kind: "playing", trackId: track.id, progress: this.#progress(track) });
  }

  #reportProgress(): void {
    if (this.#state.kind !== "playing" || this.#activeTrack === undefined) return;
    this.#publish({
      kind: "playing",
      trackId: this.#activeTrack.id,
      progress: this.#progress(this.#activeTrack),
    });
  }

  #end(): void {
    this.#generation += 1;
    this.#reset();
    this.#publish(IDLE);
  }

  #fail(trackId: SampleTrackId): void {
    this.#generation += 1;
    this.#reset();
    this.#publish(IDLE);
    for (const listener of this.#errorListeners) listener({ trackId });
  }

  #progress(track: SampleTrack): number {
    const seconds = track.durationMs / 1000;
    return seconds <= 0 ? 0 : Math.min(1, this.#audio.currentTime / seconds);
  }

  #reset(): void {
    this.#audio.pause();
    this.#audio.src = "";
    if (this.#objectUrl !== undefined) {
      this.#ports.revoke(this.#objectUrl);
      this.#objectUrl = undefined;
    }
    this.#streaming = false;
    this.#activeTrack = undefined;
  }

  #publish(state: SamplePreviewState): void {
    this.#state = state;
    for (const listener of this.#listeners) listener(state);
  }
}
