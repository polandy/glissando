import { FlacSampleQueue, SAMPLE_FORMAT, flacDepthOf, type DecodedAudio } from "../flac-samples";
import { UnconvertibleMusicError } from "../music-conversion";
import loaderUrl from "../libav/libav-6.10.9.0-glissando-audio.mjs?url";
import factoryUrl from "../libav/libav-6.10.9.0-glissando-audio.wasm.mjs?url";
import wasmUrl from "../libav/libav-6.10.9.0-glissando-audio.wasm.wasm?url";

/** The part of libav.js's API the conversion uses; its own types are not shipped with the build. */
interface LibAVStream {
  readonly index: number;
  readonly codec_type: number;
  readonly codec_id: number;
  readonly codecpar: number;
  readonly time_base_num: number;
  readonly time_base_den: number;
  /** In seconds; 0 when the container does not say. */
  readonly duration: number;
}
interface LibAVFrame {
  readonly format: number;
  readonly sample_rate?: number;
  readonly channel_layout?: number;
  readonly channels?: number;
  readonly nb_samples: number;
  readonly data: DecodedAudio["data"];
}
/** A frame handed to the encoder: interleaved samples in its sample format. */
interface EncoderFrame {
  readonly data: Int16Array | Int32Array;
  readonly format: number;
  readonly sample_rate: number;
  readonly channel_layout: number;
  readonly channels: number;
  readonly nb_samples: number;
  readonly pts: number;
}
interface LibAVPacket {
  readonly pts?: number;
}
interface LibAV {
  readonly AVMEDIA_TYPE_AUDIO: number;
  readonly AVERROR_EOF: number;
  readonly EAGAIN: number;
  mkreadaheadfile(name: string, file: Blob): Promise<void>;
  ff_init_demuxer_file(name: string): Promise<[number, LibAVStream[]]>;
  ff_init_decoder(
    codecId: number,
    config: { codecpar: number; time_base: [number, number] },
  ): Promise<[number, number, number, number]>;
  ff_read_frame_multi(
    formatContext: number,
    packet: number,
    options: { limit: number },
  ): Promise<[number, Record<number, LibAVPacket[]>]>;
  ff_decode_multi(
    context: number,
    packet: number,
    frame: number,
    packets: readonly LibAVPacket[],
    config: { fin: boolean; ignoreErrors: boolean },
  ): Promise<LibAVFrame[]>;
  ff_init_encoder(
    name: string,
    options: {
      ctx: { sample_rate: number; sample_fmt: number; channel_layout: number };
      time_base: [number, number];
    },
  ): Promise<[number, number, number, number, number]>;
  ff_encode_multi(
    context: number,
    frame: number,
    packet: number,
    frames: readonly EncoderFrame[],
    config: { fin: boolean },
  ): Promise<LibAVPacket[]>;
  ff_init_muxer(
    options: { format_name: string; filename: string; open: boolean },
    streams: [number, number, number][],
  ): Promise<[number, number, number, number[]]>;
  avformat_write_header(formatContext: number, options: number): Promise<number>;
  ff_write_multi(
    formatContext: number,
    packet: number,
    packets: readonly LibAVPacket[],
  ): Promise<void>;
  av_write_trailer(formatContext: number): Promise<number>;
  readFile(name: string): Promise<Uint8Array<ArrayBuffer>>;
  terminate(): void;
}
interface LibAVLoader {
  LibAV(options: { toImport: string; wasmurl: string; nothreads: boolean }): Promise<LibAV>;
}

const INPUT_NAME = "input";
const OUTPUT_NAME = "output.flac";
const FLAC_MIME_TYPE = "audio/flac";
/** How much compressed audio one step reads, so a long track never sits in memory twice. */
const READ_LIMIT_BYTES = 1024 * 1024;
/** Masks of FFmpeg's default layouts, for decoders that leave the layout unset. */
const DEFAULT_CHANNEL_LAYOUTS: Readonly<Record<number, number>> = { 1: 0x4, 2: 0x3 };

/**
 * Decodes the file with the own libav.js build (ADR-0020) in its worker and encodes it to FLAC.
 */
export async function convertToFlac(
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<File> {
  const loader = (await import(/* @vite-ignore */ loaderUrl)) as { default: LibAVLoader };
  const libav = await loader.default.LibAV({
    toImport: factoryUrl,
    wasmurl: wasmUrl,
    nothreads: true,
  });
  try {
    signal.throwIfAborted();
    const flac = await transcode(libav, file, onProgress, signal);
    return new File([flac], flacName(file.name), { type: FLAC_MIME_TYPE });
  } catch (error) {
    signal.throwIfAborted();
    throw new UnconvertibleMusicError(file.name, { cause: error });
  } finally {
    libav.terminate();
  }
}

function flacName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return `${dot > 0 ? fileName.slice(0, dot) : fileName}.flac`;
}

async function transcode(
  libav: LibAV,
  file: File,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  await libav.mkreadaheadfile(INPUT_NAME, file);
  const [input, streams] = await libav.ff_init_demuxer_file(INPUT_NAME);
  const stream = streams.find((candidate) => candidate.codec_type === libav.AVMEDIA_TYPE_AUDIO);
  if (stream === undefined) throw new Error(`"${file.name}" has no audio stream`);
  const [, decoder, decoderPacket, decoderFrame] = await libav.ff_init_decoder(stream.codec_id, {
    codecpar: stream.codecpar,
    time_base: [stream.time_base_num, stream.time_base_den],
  });
  let encoding: Encoding | null = null;
  let finished = false;
  while (!finished) {
    signal.throwIfAborted();
    // A step reads at most READ_LIMIT_BYTES, so cancelling waits for one step at most.
    const [status, packetsByStream] = await libav.ff_read_frame_multi(input, decoderPacket, {
      limit: READ_LIMIT_BYTES,
    });
    finished = status === libav.AVERROR_EOF;
    // EAGAIN: the read-ahead file is still fetching the next part of the Blob; read again.
    if (!finished && status !== 0 && status !== -libav.EAGAIN) {
      throw new Error(`reading "${file.name}" failed with libav status ${status}`);
    }
    const packets = packetsByStream[stream.index] ?? [];
    const frames = await libav.ff_decode_multi(decoder, decoderPacket, decoderFrame, packets, {
      fin: finished,
      ignoreErrors: false,
    });
    const first = frames[0];
    if (encoding === null && first !== undefined) encoding = await startEncoding(libav, first);
    if (encoding !== null) await encoding.write(frames, finished);
    const lastPts = packets.at(-1)?.pts;
    if (lastPts !== undefined && stream.duration > 0) {
      const seconds = (lastPts * stream.time_base_num) / stream.time_base_den;
      onProgress(Math.min(1, seconds / stream.duration));
    }
  }
  if (encoding === null) throw new Error(`"${file.name}" decoded to no audio`);
  await encoding.close();
  onProgress(1);
  return libav.readFile(OUTPUT_NAME);
}

interface Encoding {
  write(frames: readonly LibAVFrame[], last: boolean): Promise<void>;
  close(): Promise<void>;
}

/** Keeps the decoder's rate, channels and, up to 24 bits, its depth. */
async function startEncoding(libav: LibAV, first: LibAVFrame): Promise<Encoding> {
  const sampleRate = first.sample_rate ?? 0;
  const channels = first.channels ?? 0;
  const channelLayout = first.channel_layout || DEFAULT_CHANNEL_LAYOUTS[channels] || 0;
  const depth = flacDepthOf(first.format);
  const sampleFormat = depth === 24 ? SAMPLE_FORMAT.S32 : SAMPLE_FORMAT.S16;
  const [, encoder, encoderFrame, encoderPacket, frameSize] = await libav.ff_init_encoder("flac", {
    ctx: { sample_rate: sampleRate, sample_fmt: sampleFormat, channel_layout: channelLayout },
    time_base: [1, sampleRate],
  });
  const [output] = await libav.ff_init_muxer(
    { format_name: "flac", filename: OUTPUT_NAME, open: true },
    [[encoder, 1, sampleRate]],
  );
  await libav.avformat_write_header(output, 0);
  const queue = new FlacSampleQueue(depth, channels, frameSize);
  let samplesWritten = 0;
  return {
    async write(frames, last) {
      for (const frame of frames) {
        queue.push({ format: frame.format, nbSamples: frame.nb_samples, data: frame.data });
      }
      const encoderFrames = queue.takeFrames(last).map((data): EncoderFrame => {
        const nbSamples = data.length / channels;
        const pts = samplesWritten;
        samplesWritten += nbSamples;
        return {
          data,
          format: sampleFormat,
          sample_rate: sampleRate,
          channel_layout: channelLayout,
          channels,
          nb_samples: nbSamples,
          pts,
        };
      });
      const packets = await libav.ff_encode_multi(
        encoder,
        encoderFrame,
        encoderPacket,
        encoderFrames,
        {
          fin: last,
        },
      );
      await libav.ff_write_multi(output, encoderPacket, packets);
    },
    async close() {
      await libav.av_write_trailer(output);
    },
  };
}
