import { MILLISECONDS_PER_SECOND, type MusicTrack } from "../../player";
import { trackGainRamps } from "../music-ramps";
import { AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, type AudioSegment } from "../plan";
import type { AudioSource } from "../ports";

/** Long enough for `decodeAudioData`, which needs a context but renders nothing. */
const DECODING_CONTEXT_FRAMES = 1;

/** Reads a song's file by a track's `src`. */
export type OpenMusic = (src: string) => Promise<Blob>;

interface DecodedTrack {
  readonly track: MusicTrack;
  readonly audio: AudioBuffer;
}

/**
 * The playlist's tracks mixed along slideshow time, each from its place on its own gain envelope,
 * rendered one segment at a time in its own `OfflineAudioContext`, so only the decoded songs and
 * one segment are held at once. See ADR-0023.
 */
export class MusicRenderer implements AudioSource<AudioData> {
  readonly #tracks: readonly DecodedTrack[];

  private constructor(tracks: readonly DecodedTrack[]) {
    this.#tracks = tracks;
  }

  /** Decodes each distinct song once, resampled to the export's rate. */
  static async decode(tracks: readonly MusicTrack[], openMusic: OpenMusic): Promise<MusicRenderer> {
    const context = new OfflineAudioContext(
      AUDIO_CHANNELS,
      DECODING_CONTEXT_FRAMES,
      AUDIO_SAMPLE_RATE,
    );
    const sources = [...new Set(tracks.map((track) => track.src))];
    const decoded = new Map(
      await Promise.all(
        sources.map(async (src) => {
          const bytes = await (await openMusic(src)).arrayBuffer();
          return [src, await context.decodeAudioData(bytes)] as const;
        }),
      ),
    );
    return new MusicRenderer(
      tracks.map((track) => ({ track, audio: decodedOrThrow(decoded, track.src) })),
    );
  }

  async segment({ startSample, sampleCount, timestampUs }: AudioSegment): Promise<AudioData> {
    const context = new OfflineAudioContext(AUDIO_CHANNELS, sampleCount, AUDIO_SAMPLE_RATE);
    const fromMs = (startSample / AUDIO_SAMPLE_RATE) * MILLISECONDS_PER_SECOND;
    const toMs = ((startSample + sampleCount) / AUDIO_SAMPLE_RATE) * MILLISECONDS_PER_SECOND;
    for (const decoded of this.#tracks) {
      if (isHeardBetween(decoded.track, fromMs, toMs)) {
        mixInto(context, decoded, fromMs, toMs);
      }
    }
    const rendered = await context.startRendering();
    return new AudioData({
      format: "f32-planar",
      sampleRate: AUDIO_SAMPLE_RATE,
      numberOfFrames: sampleCount,
      numberOfChannels: AUDIO_CHANNELS,
      timestamp: timestampUs,
      data: planar(rendered),
    });
  }
}

function decodedOrThrow(decoded: ReadonlyMap<string, AudioBuffer>, src: string): AudioBuffer {
  const audio = decoded.get(src);
  if (audio === undefined) {
    throw new Error(`the song ${src} was not decoded`);
  }
  return audio;
}

function isHeardBetween(track: MusicTrack, fromMs: number, toMs: number): boolean {
  return track.atMs < toMs && track.atMs + track.endMs - track.startMs > fromMs;
}

/** Plays `decoded` into `context`, which renders slideshow time `fromMs` to `toMs`. */
function mixInto(
  context: OfflineAudioContext,
  { track, audio }: DecodedTrack,
  fromMs: number,
  toMs: number,
): void {
  const gain = context.createGain();
  for (const { atMs, gain: value, kind } of trackGainRamps(track, fromMs, toMs)) {
    const atSeconds = atMs / MILLISECONDS_PER_SECOND;
    if (kind === "set") {
      gain.gain.setValueAtTime(value, atSeconds);
    } else {
      gain.gain.linearRampToValueAtTime(value, atSeconds);
    }
  }
  gain.connect(context.destination);
  const source = context.createBufferSource();
  source.buffer = audio;
  source.connect(gain);
  const startsInsideMs = Math.max(0, track.atMs - fromMs);
  const trackOffsetMs = track.startMs + Math.max(0, fromMs - track.atMs);
  const trackOffsetSeconds = trackOffsetMs / MILLISECONDS_PER_SECOND;
  if (trackOffsetSeconds < audio.duration) {
    source.start(startsInsideMs / MILLISECONDS_PER_SECOND, trackOffsetSeconds);
  }
}

/** The channels one after another, as `f32-planar` wants them. */
function planar(buffer: AudioBuffer): Float32Array<ArrayBuffer> {
  const data = new Float32Array(buffer.length * buffer.numberOfChannels);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    data.set(buffer.getChannelData(channel), channel * buffer.length);
  }
  return data;
}
