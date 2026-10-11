import { isTrackHeardAt, trackGainAt, trackSecondsAt } from "./music-gain";
import type { MusicPlayback } from "./ports";
import type { MusicTrack } from "./slideshow";

interface PlacedTrack {
  readonly track: MusicTrack;
  readonly playback: MusicPlayback;
  sounding: boolean;
}

/**
 * Plays a playlist along slideshow time: each track from its place, at its start, at the volume of
 * its own fade envelope, and only while it is heard; two at once in a crossfade. See ADR-0023.
 */
export class PlaylistMusic {
  readonly #tracks: readonly PlacedTrack[];

  constructor(tracks: readonly MusicTrack[], openMusic: (src: string) => MusicPlayback) {
    this.#tracks = tracks.map((track) => ({
      track,
      playback: openMusic(track.src),
      sounding: false,
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
        starts.push(start(placed, timeMs));
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
        placed.playback.setVolume(trackGainAt(placed.track, timeMs));
      } else if (placed.sounding) {
        pause(placed);
      } else if (heard) {
        starts.push(start(placed, timeMs));
      }
    }
    return Promise.all(starts).then(() => undefined);
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
}

function start(placed: PlacedTrack, timeMs: number): Promise<void> {
  placed.playback.setVolume(trackGainAt(placed.track, timeMs));
  placed.sounding = true;
  return placed.playback.play(trackSecondsAt(placed.track, timeMs));
}

/** Starts and at once pauses the track at its start, silent, so it counts as user-started. */
function prime({ track, playback }: PlacedTrack): Promise<void> {
  playback.setVolume(0);
  const started = playback.play(trackSecondsAt(track, track.atMs));
  playback.pause();
  return started;
}

function pause(placed: PlacedTrack): void {
  placed.sounding = false;
  placed.playback.pause();
}
