// Page side of the per-frame WebGL work: injected after instrument.mjs, it counts the draw,
// program, framebuffer and texture-delete calls of each animation frame into
// window.__probe.frameWork and times each frame on the GPU with EXT_disjoint_timer_query_webgl2
// into window.__probe.gpuFrames. frame-work.ts summarises both.
/* global window, performance, requestAnimationFrame, WebGL2RenderingContext */

export const instrumentGl = () => {
  const probe = window.__probe;
  probe.frameWork = [];
  probe.gpuFrames = [];
  probe.gl = null;
  const proto = WebGL2RenderingContext.prototype;
  let counts = { draws: 0, programs: 0, framebuffers: 0, textureDeletes: 0 };
  const count = (name, key) => {
    const original = proto[name];
    proto[name] = function (...a) {
      probe.gl ??= this;
      counts[key] += 1;
      return original.apply(this, a);
    };
  };
  count("drawArrays", "draws");
  count("drawElements", "draws");
  count("useProgram", "programs");
  count("bindFramebuffer", "framebuffers");
  count("deleteTexture", "textureDeletes");

  let timer;
  let open = null;
  const pending = [];
  const timeFrame = (gl, t) => {
    timer ??= gl.getExtension("EXT_disjoint_timer_query_webgl2");
    if (!timer) return;
    if (gl.isContextLost()) {
      open = null;
      pending.length = 0;
      return;
    }
    if (open) {
      gl.endQuery(timer.TIME_ELAPSED_EXT);
      pending.push(open);
    }
    const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT);
    while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
      const done = pending.shift();
      const ns = gl.getQueryParameter(done.query, gl.QUERY_RESULT);
      if (!disjoint) probe.gpuFrames.push({ t: done.t, ms: ns / 1e6 });
      gl.deleteQuery(done.query);
    }
    open = { t, query: gl.createQuery() };
    gl.beginQuery(timer.TIME_ELAPSED_EXT, open.query);
  };

  // Registered before the app's: each tick closes the frame before it and opens the next.
  let last = null;
  const tick = () => {
    const now = performance.now();
    if (last !== null) probe.frameWork.push({ t: last, ...counts });
    counts = { draws: 0, programs: 0, framebuffers: 0, textureDeletes: 0 };
    if (probe.gl) timeFrame(probe.gl, now);
    last = now;
    if (probe.frameWork.length < 100_000) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
