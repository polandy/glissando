// What each animation frame asked of WebGL and the GPU, from instrument-gl.mjs, summarised so
// a dropped frame names the work of the frame drawn right before it.

/** The calls between two animation-frame ticks; `t` is the tick the frame started at. */
export interface FrameWork {
  readonly t: number;
  readonly draws: number;
  readonly programs: number;
  readonly framebuffers: number;
  readonly textureDeletes: number;
}

/** The GPU time of the frame that started at tick `t`, from a timer query. */
export interface GpuSample {
  readonly t: number;
  readonly ms: number;
}

export interface FrameWorkInput {
  readonly work: readonly FrameWork[];
  readonly gpu: readonly GpuSample[];
  /** When each picture's texture was allocated (`texStorage2D`), in performance.now() ms. */
  readonly pictureStarts: readonly number[];
  readonly playStart: number;
}

/** A gap longer than this lost at least one frame at 60 Hz. */
const DROPPED_FRAME_GAP_MS = 33;
/** A gap starting closer than this to a picture start counts as at a slide boundary. */
const PICTURE_START_WINDOW_MS = 400;
const DROPPED_FRAME_LIST_LIMIT = 40;

const round = (n: number): number => Number(n.toFixed(1));
const percentile = (sorted: readonly number[], q: number): number | null =>
  sorted.length
    ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? null)
    : null;

export function summarizeFrameWork({ work, gpu, pictureStarts, playStart }: FrameWorkInput) {
  const frames = work.filter((f) => f.t >= playStart);
  const gpuByTick = new Map(gpu.filter((g) => g.t >= playStart).map((g) => [g.t, g.ms]));
  const dropped = frames.slice(0, -1).flatMap((f, i) => {
    const ms = (frames[i + 1]?.t ?? f.t) - f.t;
    return ms > DROPPED_FRAME_GAP_MS ? [{ frame: f, ms }] : [];
  });
  const nearPictureStart = dropped.filter(({ frame }) =>
    pictureStarts.some((s) => Math.abs(s - frame.t) < PICTURE_START_WINDOW_MS),
  );
  const gpuOf = (t: number) => {
    const ms = gpuByTick.get(t);
    return ms === undefined ? null : round(ms);
  };
  const gpuMs = [...gpuByTick.values()].sort((a, b) => a - b);
  const most = (key: keyof Omit<FrameWork, "t">) => Math.max(0, ...frames.map((f) => f[key]));
  const p50 = percentile(gpuMs, 0.5);
  const p99 = percentile(gpuMs, 0.99);
  return {
    rafGapsOver33ms: dropped.length,
    rafGapsOver33msNearPictureStart: nearPictureStart.length,
    maxDrawsPerFrame: most("draws"),
    maxProgramsPerFrame: most("programs"),
    maxFramebuffersPerFrame: most("framebuffers"),
    textureDeletes: frames.reduce((n, f) => n + f.textureDeletes, 0),
    framesWithTextureDelete: frames.filter((f) => f.textureDeletes > 0).length,
    gpuFrames: gpuMs.length,
    gpuMsP50: p50 === null ? null : round(p50),
    gpuMsP99: p99 === null ? null : round(p99),
    gpuMsMax: gpuMs.length ? round(gpuMs[gpuMs.length - 1] ?? 0) : null,
    droppedFrameWork: dropped.slice(0, DROPPED_FRAME_LIST_LIMIT).map(({ frame, ms }) => ({
      at: round((frame.t - playStart) / 1000),
      ms: round(ms),
      draws: frame.draws,
      programs: frame.programs,
      framebuffers: frame.framebuffers,
      textureDeletes: frame.textureDeletes,
      gpuMs: gpuOf(frame.t),
    })),
  };
}
