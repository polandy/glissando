import { isTrackHeardAt, startFadeGainAt, trackGainAt, trackSecondsAt } from "./music-gain";
import type { MusicPlayback } from "./ports";
import { MILLISECONDS_PER_SECOND, type MusicTrack } from "./slideshow";

/** Off the beat beyond this, yet above `currentTime` granularity and an idle device's seek. */
const MUSIC_RESYNC_MS = 150;

interface PlacedTrack {
  readonly track: MusicTrack;
  readonly playback: MusicPlayback;
  sounding: boolean;
  /** Since the last reading while it really played, it started or stalled, not just seeked. */
  stalled: boolean;
  /** A resync seek waits for its first reading while the track really plays again. */
  settling: boolean;
  /** Signed drift where the last resync seek landed, accepted until the track drifts on from it. */
  seekLagMs: number;
}

/**
 * Plays a playlist along slideshow time: each track from its place, at its start, at its own
 * `gain` (ADR-0040) times its own fade envelope, and only while it is heard; two at once in a
 * crossfade. See ADR-0023.
 */
export class PlaylistMusic {
  readonly #tracks: readonly PlacedTrack[];
  readonly #duckAt: (timeMs: number) => number;
  /** Where the show started part-way, null for a start at the beginning or after a seek. */
  #fadeInFromMs: number | null = null;

  /** `duckAt` is the factor every track's volume is multiplied by at a slideshow time (ADR-0035). */
  constructor(
    tracks: readonly MusicTrack[],
    openMusic: (src: string) => MusicPlayback,
    duckAt: (timeMs: number) => number = () => 1,
  ) {
    this.#duckAt = duckAt;
    this.#tracks = tracks.map((track) => ({
      track,
      playback: openMusic(track.src),
      sounding: false,
      stalled: false,
      settling: false,
      seekLagMs: 0,
    }));
  }

  /**
   * Plays every track heard at slideshow time `timeMs` and primes every other one at its start.
   * Call it in the user's play gesture: iOS lets an element play outside a gesture (a track
   * reaching its place on a frame) only once it has played inside one.
   */
  play(timeMs: number): Promise<void> {
    const starts: Promise<void>[] = [];
    for (const placed of this.#tracks) {
      if (isTrackHeardAt(placed.track, timeMs)) {
        starts.push(this.#start(placed, timeMs));
      } else if (!placed.sounding) {
        starts.push(prime(placed));
      }
    }
    return Promise.all(starts).then(() => undefined);
  }

  /**
   * Follows every envelope to slideshow time `timeMs`: starts a track reaching its place, pauses
   * one that is over.
   */
  follow(timeMs: number): Promise<void> {
    const starts: Promise<void>[] = [];
    for (const placed of this.#tracks) {
      const heard = isTrackHeardAt(placed.track, timeMs);
      if (placed.sounding && heard) {
        placed.playback.setVolume(this.#volumeAt(placed.track, timeMs));
        resync(placed, timeMs);
      } else if (placed.sounding) {
        pause(placed);
      } else if (heard) {
        starts.push(this.#start(placed, timeMs));
      }
    }
    return Promise.all(starts).then(() => undefined);
  }

  /** Fades every track in from slideshow time `timeMs`, until the next `clearFadeIn`. */
  fadeInFrom(timeMs: number): void {
    this.#fadeInFromMs = timeMs;
  }

  clearFadeIn(): void {
    this.#fadeInFromMs = null;
  }

  /** Pauses every sounding track. */
  pause(): void {
    for (const placed of this.#tracks) {
      if (placed.sounding) {
        pause(placed);
      }
    }
  }

  dispose(): void {
    for (const placed of this.#tracks) {
      placed.sounding = false;
      placed.playback.dispose();
    }
  }

  #start(placed: PlacedTrack, timeMs: number): Promise<void> {
    placed.playback.setVolume(this.#volumeAt(placed.track, timeMs));
    placed.sounding = true;
    placed.stalled = true;
    placed.settling = false;
    placed.seekLagMs = 0;
    return placed.playback.play(trackSecondsAt(placed.track, timeMs));
  }

  #volumeAt(track: MusicTrack, timeMs: number): number {
    const fadeIn = this.#fadeInFromMs === null ? 1 : startFadeGainAt(this.#fadeInFromMs, timeMs);
    return track.gain * trackGainAt(track, timeMs) * this.#duckAt(timeMs) * fadeIn;
  }
}

/** Starts and at once pauses the track at its start, silent, so it counts as user-started. */
function prime({ track, playback }: PlacedTrack): Promise<void> {
  playback.setVolume(0);
  const started = playback.play(trackSecondsAt(track, track.atMs));
  playback.pause();
  return started;
}

/** Seeks a playing track back after a start or stall, never chasing its own seek (ADR-0056). */
function resync(placed: PlacedTrack, timeMs: number): void {
  const { track, playback } = placed;
  const playingSeconds = playback.playingSeconds();
  if (playingSeconds === null) {
    placed.stalled ||= !placed.settling;
    return;
  }
  const stalled = placed.stalled;
  placed.stalled = false;
  const placeSeconds = trackSecondsAt(track, timeMs);
  // Whole milliseconds, so a drift of exactly the tolerance is not tipped over by float error.
  const driftMs = Math.round((playingSeconds - placeSeconds) * MILLISECONDS_PER_SECOND);
  if (placed.settling) {
    placed.settling = false;
    placed.seekLagMs = driftMs;
  } else if (Math.abs(driftMs) <= MUSIC_RESYNC_MS) {
    placed.seekLagMs = 0;
  } else if (stalled && Math.abs(driftMs - placed.seekLagMs) > MUSIC_RESYNC_MS) {
    playback.seek(placeSeconds);
    placed.settling = true;
  }
}

function pause(placed: PlacedTrack): void {
  placed.sounding = false;
  placed.playback.pause();
}
