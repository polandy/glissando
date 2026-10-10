import { MILLISECONDS_PER_SECOND, type MusicEnvelope } from "../../player";
import { musicGainRamps } from "../music-ramps";
import { AUDIO_CHANNELS, AUDIO_SAMPLE_RATE, type AudioSegment } from "../plan";
import type { AudioSource } from "../ports";

/** Long enough for `decodeAudioData`, which needs a context but renders nothing. */
const DECODING_CONTEXT_FRAMES = 1;

/**
 * The music's excerpt along slideshow time, rendered one segment at a time in its own
 * `OfflineAudioContext`, so only the decoded track and one segment are held at once.
 */
export class MusicRenderer implements AudioSource<AudioData> {
  readonly #track: AudioBuffer;
  readonly #envelope: MusicEnvelope;

  private constructor(track: AudioBuffer, envelope: MusicEnvelope) {
    this.#track = track;
    this.#envelope = envelope;
  }

  /** Decodes `bytes` once, resampled to the export's rate. */
  static async decode(bytes: ArrayBuffer, envelope: MusicEnvelope): Promise<MusicRenderer> {
    const context = new OfflineAudioContext(
      AUDIO_CHANNELS,
      DECODING_CONTEXT_FRAMES,
      AUDIO_SAMPLE_RATE,
    );
    return new MusicRenderer(await context.decodeAudioData(bytes), envelope);
  }

  async segment({ startSample, sampleCount, timestampUs }: AudioSegment): Promise<AudioData> {
    const context = new OfflineAudioContext(AUDIO_CHANNELS, sampleCount, AUDIO_SAMPLE_RATE);
    const fromMs = (startSample / AUDIO_SAMPLE_RATE) * MILLISECONDS_PER_SECOND;
    const toMs = ((startSample + sampleCount) / AUDIO_SAMPLE_RATE) * MILLISECONDS_PER_SECOND;
    const gain = context.createGain();
    for (const { atMs, gain: value, kind } of musicGainRamps(this.#envelope, fromMs, toMs)) {
      const atSeconds = atMs / MILLISECONDS_PER_SECOND;
      if (kind === "set") {
        gain.gain.setValueAtTime(value, atSeconds);
      } else {
        gain.gain.linearRampToValueAtTime(value, atSeconds);
      }
    }
    gain.connect(context.destination);
    const source = context.createBufferSource();
    source.buffer = this.#track;
    source.connect(gain);
    const trackOffsetSeconds = (this.#envelope.startMs + fromMs) / MILLISECONDS_PER_SECOND;
    if (trackOffsetSeconds < this.#track.duration) {
      source.start(0, trackOffsetSeconds);
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

/** The channels one after another, as `f32-planar` wants them. */
function planar(buffer: AudioBuffer): Float32Array<ArrayBuffer> {
  const data = new Float32Array(buffer.length * buffer.numberOfChannels);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    data.set(buffer.getChannelData(channel), channel * buffer.length);
  }
  return data;
}
