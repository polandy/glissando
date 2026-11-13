// Page side of scripts/probe-playback-stutter/probe.mjs: injected before the app, collects
// everything in window.__probe. The probe reads it out once the run is over.
/* global window, performance, setTimeout, requestAnimationFrame, HTMLImageElement, HTMLMediaElement, HTMLAudioElement, WebGL2RenderingContext, PerformanceObserver, ImageBitmap, HTMLVideoElement */

export const instrument = () => {
  const probe = {
    longTasks: [],
    blocks: [],
    slowGlCalls: [],
    imageDecodes: [],
    frames: [],
    tex: [],
    bitmaps: [],
    audio: null,
    audioEvents: [],
    audioTicks: [],
    renderer: null,
    started: null,
    mipmaps: [],
    pictureStarts: [],
    workerMessages: [],
    audioDecodes: [],
    context: null,
    outputTimestamps: [],
    renderCapacity: [],
  };
  window.__probe = probe;
  const generateMipmap = WebGL2RenderingContext.prototype.generateMipmap;
  WebGL2RenderingContext.prototype.generateMipmap = function (...a) {
    const start = performance.now();
    try {
      return generateMipmap.apply(this, a);
    } finally {
      probe.mipmaps.push({ t: start, ms: performance.now() - start });
    }
  };
  const texStorage2D = WebGL2RenderingContext.prototype.texStorage2D;
  WebGL2RenderingContext.prototype.texStorage2D = function (...a) {
    probe.pictureStarts.push({ t: performance.now(), w: a[3], h: a[4] });
    return texStorage2D.apply(this, a);
  };
  const byteLength = (data) => {
    if (data instanceof ArrayBuffer) return data.byteLength;
    if (ArrayBuffer.isView(data)) return data.byteLength;
    if (data && typeof data === "object")
      return Object.values(data).reduce((n, v) => n + byteLength(v), 0);
    return 0;
  };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...a) {
      super(...a);
      this.addEventListener("message", (event) => {
        probe.workerMessages.push({
          t: performance.now(),
          dir: "in",
          bytes: byteLength(event.data),
        });
      });
    }
    postMessage(...a) {
      probe.workerMessages.push({ t: performance.now(), dir: "out", bytes: byteLength(a[0]) });
      return super.postMessage(...a);
    }
  };
  for (const Context of [window.AudioContext, window.OfflineAudioContext]) {
    const decodeAudioData = Context.prototype.decodeAudioData;
    Context.prototype.decodeAudioData = function (...a) {
      const start = performance.now();
      const result = decodeAudioData.apply(this, a);
      result.then((buffer) =>
        probe.audioDecodes.push({ t: start, ms: performance.now() - start, s: buffer.duration }),
      );
      return result;
    };
  }
  const NativeAudioContext = window.AudioContext;
  window.AudioContext = class extends NativeAudioContext {
    constructor(...a) {
      super(...a);
      if (!probe.context) {
        probe.context = this;
        const capacity = this.renderCapacity;
        if (capacity) {
          capacity.addEventListener("update", (e) =>
            probe.renderCapacity.push({
              t: performance.now(),
              underrunRatio: e.underrunRatio,
              averageLoad: e.averageLoad,
              peakLoad: e.peakLoad,
            }),
          );
          capacity.start({ updateInterval: 1 });
        }
      }
    }
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries())
      probe.longTasks.push({ t: entry.startTime, ms: entry.duration });
  }).observe({ type: "longtask", buffered: true });

  const texImage2D = WebGL2RenderingContext.prototype.texImage2D;
  WebGL2RenderingContext.prototype.texImage2D = function (...a) {
    const source = a[a.length - 1];
    const start = performance.now();
    try {
      return texImage2D.apply(this, a);
    } finally {
      const kind =
        source instanceof ImageBitmap
          ? "bitmap"
          : source instanceof HTMLVideoElement
            ? "video"
            : typeof source;
      const w = source?.width ?? source?.videoWidth ?? a[3];
      const h = source?.height ?? source?.videoHeight ?? a[4];
      probe.tex.push({ t: start, ms: performance.now() - start, kind, w, h });
      if (!probe.renderer) {
        const info = this.getExtension("WEBGL_debug_renderer_info");
        probe.renderer = info ? this.getParameter(info.UNMASKED_RENDERER_WEBGL) : "unknown";
      }
    }
  };
  const texSubImage2D = WebGL2RenderingContext.prototype.texSubImage2D;
  WebGL2RenderingContext.prototype.texSubImage2D = function (...a) {
    const source = a[a.length - 1];
    const start = performance.now();
    try {
      return texSubImage2D.apply(this, a);
    } finally {
      probe.tex.push({
        t: start,
        ms: performance.now() - start,
        kind: "sub",
        w: source?.width ?? a[4],
        h: source?.height ?? a[5],
      });
    }
  };
  const createImageBitmap = window.createImageBitmap;
  window.createImageBitmap = function (...a) {
    const start = performance.now();
    const result = createImageBitmap.apply(window, a);
    result.then((bitmap) =>
      probe.bitmaps.push({
        t: start,
        ms: performance.now() - start,
        w: bitmap.width,
        h: bitmap.height,
        source: a[0]?.constructor?.name,
      }),
    );
    return result;
  };

  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (this instanceof HTMLAudioElement && !probe.audio) trackAudio(this);
    return play.apply(this, arguments);
  };
  function trackAudio(audio) {
    probe.audio = audio;
    probe.started = performance.now();
    for (const type of [
      "seeking",
      "seeked",
      "waiting",
      "stalled",
      "playing",
      "pause",
      "ended",
      "error",
    ])
      audio.addEventListener(type, () =>
        probe.audioEvents.push({ t: performance.now(), type, ct: audio.currentTime }),
      );
  }
  // A 4 ms timer chain: a late fire is a main-thread block, in every engine.
  let lastTimer = performance.now();
  const timerTick = () => {
    const now = performance.now();
    if (now - lastTimer > 50) probe.blocks.push({ t: lastTimer, ms: now - lastTimer });
    lastTimer = now;
    setTimeout(timerTick, 4);
  };
  setTimeout(timerTick, 4);
  const imageDecode = HTMLImageElement.prototype.decode;
  HTMLImageElement.prototype.decode = function () {
    const t0 = performance.now();
    return imageDecode.call(this).finally(() => {
      probe.imageDecodes.push({
        t: t0,
        ms: performance.now() - t0,
        w: this.naturalWidth,
        h: this.naturalHeight,
      });
    });
  };
  // Every WebGL2 call over 20 ms: the one that waits for the GPU shows up here.
  const SLOW_GL_MS = 20;
  const glProto = window.WebGL2RenderingContext?.prototype;
  if (glProto)
    for (const name of Object.getOwnPropertyNames(glProto)) {
      const descriptor = Object.getOwnPropertyDescriptor(glProto, name);
      if (typeof descriptor?.value !== "function" || name === "constructor") continue;
      const original = descriptor.value;
      glProto[name] = function (...args) {
        const t0 = performance.now();
        const result = original.apply(this, args);
        const ms = performance.now() - t0;
        if (ms > SLOW_GL_MS) probe.slowGlCalls.push({ t: t0, name, ms });
        return result;
      };
    }
  const tick = () => {
    const now = performance.now();
    probe.frames.push(now);
    const audio = probe.audio;
    if (audio)
      probe.audioTicks.push({
        t: now,
        ct: audio.currentTime,
        rs: audio.readyState,
        paused: audio.paused,
        seeking: audio.seeking,
      });
    const context = probe.context;
    if (context && context.state === "running") {
      const stamp = context.getOutputTimestamp();
      probe.outputTimestamps.push({ t: now, ct: stamp.contextTime, pt: stamp.performanceTime });
    }
    if (probe.frames.length < 100_000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
