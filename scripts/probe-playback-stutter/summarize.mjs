// Turns what scripts/probe-playback-stutter/instrument.mjs collected into the summary line and
// the top self-time functions of the CPU profile.
/* global console */

/** Summarises the run from the show's start (playStart, in performance.now() ms) on; run names its settings. */
export const summarize = (data, playStart, run) => {
  const percentile = (values, q) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length
      ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]
      : null;
  };
  const round = (n, d = 1) => (n === null || n === undefined ? null : Number(n.toFixed(d)));
  const sum = (values) => values.reduce((a, b) => a + b, 0);
  const since = (t) => t >= playStart;

  const frames = data.frames.filter(since);
  const gaps = frames.slice(1).map((f, i) => f - frames[i]);
  const longTasks = data.longTasks.filter((l) => since(l.t));
  const blocks = data.blocks.filter((b) => since(b.t));
  const slowGlCalls = data.slowGlCalls.filter((c) => since(c.t));
  const slowGlByName = {};
  for (const c of slowGlCalls) {
    const entry = (slowGlByName[c.name] ??= { calls: 0, totalMs: 0, maxMs: 0 });
    entry.calls += 1;
    entry.totalMs = round(entry.totalMs + c.ms);
    entry.maxMs = Math.max(entry.maxMs, round(c.ms));
  }
  const imageDecodes = data.imageDecodes.filter((d) => since(d.t));
  const rel = (t) => round((t - playStart) / 1000);
  const gapTimeline = frames
    .slice(1)
    .map((t, i) => ({ at: rel(frames[i]), ms: round(t - frames[i]) }))
    .filter((g) => g.ms > 50);
  const blockedGaps = gapTimeline.filter((g) =>
    blocks.some((b) => Math.abs(rel(b.t) - g.at) < 0.1),
  );
  const tex = data.tex.filter((x) => since(x.t));
  const bitmaps = data.bitmaps.filter((x) => since(x.t));

  // The music clock: while playing and not seeking, currentTime must advance between two frames
  // more than ~30 ms apart. A frame pair where it stands still is an audible gap or an underrun.
  const ticks = data.audioTicks.filter((x) => since(x.t) && !x.paused && !x.seeking && x.rs >= 3);
  let musicStalls = 0;
  let musicStallMs = 0;
  let longestMusicStallMs = 0;
  let stallMs = 0;
  for (let i = 1; i < ticks.length; i += 1) {
    const wall = ticks[i].t - ticks[i - 1].t;
    if (wall > 30 && wall < 2000 && ticks[i].ct === ticks[i - 1].ct) {
      stallMs += wall;
      if (stallMs > 0 && (i === ticks.length - 1 || ticks[i + 1]?.ct !== ticks[i].ct)) {
        musicStalls += 1;
        musicStallMs += stallMs;
        longestMusicStallMs = Math.max(longestMusicStallMs, stallMs);
        stallMs = 0;
      }
    } else stallMs = 0;
  }
  // Jumps: the music clock moves by more than the wall clock between two frames (a seek landed).
  const musicJumps = ticks.filter(
    (x, i) => i > 0 && Math.abs(x.ct - ticks[i - 1].ct - (x.t - ticks[i - 1].t) / 1000) > 0.1,
  ).length;
  const events = data.audioEvents.filter((e) => since(e.t));
  const count = (type) => events.filter((e) => e.type === type).length;

  // The audio output clock: between two frames it must advance as much as the wall clock. Where it
  // advances less, the output ran dry for that long (an audible gap).
  const stamps = data.outputTimestamps.filter((x) => since(x.t));
  let audioDryMs = 0;
  let audioDryEvents = 0;
  let longestAudioDryMs = 0;
  for (let i = 1; i < stamps.length; i += 1) {
    const wall = stamps[i].pt - stamps[i - 1].pt;
    const rendered = (stamps[i].ct - stamps[i - 1].ct) * 1000;
    const dry = wall - rendered;
    if (dry > 5) {
      audioDryMs += dry;
      audioDryEvents += 1;
      longestAudioDryMs = Math.max(longestAudioDryMs, dry);
    }
  }
  const capacity = data.renderCapacity.filter((x) => since(x.t));
  const mipmaps = data.mipmaps.filter((x) => since(x.t));
  const pictureStarts = data.pictureStarts.filter((x) => since(x.t));
  const inbound = data.workerMessages.filter((x) => since(x.t) && x.dir === "in");
  const texBy = (kind) => tex.filter((x) => x.kind === kind);
  const subTex = texBy("sub");
  const bitmapTex = texBy("bitmap");
  return {
    renderer: data.renderer,
    ...run,
    rafFrames: frames.length,
    rafGapsOver50ms: gaps.filter((g) => g > 50).length,
    rafGapsOver100ms: gaps.filter((g) => g > 100).length,
    maxRafGapMs: round(Math.max(...gaps)),
    rafGapTimeline: gapTimeline.slice(0, 40),
    rafGapsDuringMainThreadBlock: blockedGaps.length,
    slowGlCalls: slowGlByName,
    mainThreadBlocks: blocks.length,
    mainThreadBlockMaxMs: round(Math.max(0, ...blocks.map((b) => b.ms))),
    mainThreadBlockTotalMs: round(sum(blocks.map((b) => b.ms))),
    imageDecodes: imageDecodes.length,
    imageDecodeMaxMs: round(Math.max(0, ...imageDecodes.map((d) => d.ms))),
    imageDecodeTimeline: imageDecodes
      .slice(0, 40)
      .map((d) => ({ at: rel(d.t), ms: round(d.ms), w: d.w, h: d.h })),
    pictureStartTimeline: data.pictureStarts
      .filter((s) => since(s.t))
      .slice(0, 40)
      .map((s) => rel(s.t)),
    musicEventTimeline: data.audioEvents
      .filter((e) => since(e.t))
      .slice(0, 40)
      .map((e) => ({ at: rel(e.t), type: e.type, ct: round(e.ct) })),
    longTasks: longTasks.length,
    longTaskTotalMs: round(sum(longTasks.map((l) => l.ms))),
    longTaskMaxMs: round(Math.max(0, ...longTasks.map((l) => l.ms))),
    longTasksOver100ms: longTasks.filter((l) => l.ms > 100).length,
    texBitmapCalls: bitmapTex.length,
    texBitmapSizes: [...new Set(bitmapTex.map((x) => `${x.w}x${x.h}`))].slice(0, 6),
    texBitmapMedianMs: round(
      percentile(
        bitmapTex.map((x) => x.ms),
        0.5,
      ),
      2,
    ),
    texBitmapMaxMs: round(Math.max(0, ...bitmapTex.map((x) => x.ms)), 2),
    texBitmapTotalMs: round(sum(bitmapTex.map((x) => x.ms))),
    texSubCalls: subTex.length,
    texSubMaxMs: round(Math.max(0, ...subTex.map((x) => x.ms)), 2),
    texSubTotalMs: round(sum(subTex.map((x) => x.ms))),
    mipmaps: mipmaps.length,
    mipmapMaxMs: round(Math.max(0, ...mipmaps.map((x) => x.ms)), 2),
    mipmapTotalMs: round(sum(mipmaps.map((x) => x.ms))),
    pictureStarts: pictureStarts.length,
    pictureSizes: [...new Set(pictureStarts.map((x) => `${x.w}x${x.h}`))].slice(0, 6),
    workerInboundMessages: inbound.length,
    workerInboundMB: round(sum(inbound.map((x) => x.bytes)) / 1e6),
    audioDecodes: data.audioDecodes.length,
    audioDecodeMaxMs: round(Math.max(0, ...data.audioDecodes.map((x) => x.ms))),
    audioDryEvents,
    audioDryMs: round(audioDryMs),
    longestAudioDryMs: round(longestAudioDryMs),
    hasRenderCapacity: data.hasRenderCapacity,
    underrunUpdates: capacity.filter((x) => x.underrunRatio > 0).length,
    underrunRatioMax: round(Math.max(0, ...capacity.map((x) => x.underrunRatio)), 3),
    texVideoCalls: texBy("video").length,
    texVideoMaxMs: round(Math.max(0, ...texBy("video").map((x) => x.ms)), 2),
    mainThreadBitmaps: bitmaps.length,
    mainThreadBitmapSizes: [...new Set(bitmaps.map((x) => `${x.w}x${x.h}`))].slice(0, 6),
    mainThreadBitmapMaxMs: round(Math.max(0, ...bitmaps.map((x) => x.ms))),
    musicStalls,
    musicStallMs: round(musicStallMs),
    longestMusicStallMs: round(longestMusicStallMs),
    musicJumps,
    musicSeeking: count("seeking"),
    musicWaiting: count("waiting"),
    musicStalled: count("stalled"),
    musicPlaying: count("playing"),
    musicPause: count("pause"),
  };
};

/** Prints the functions with the most self time in a CDP CPU profile. */
export const printTopSelfTime = (profile) => {
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  profile.samples.forEach((id, i) => {
    const dt = profile.timeDeltas[i] ?? 0;
    const { functionName, url: file, lineNumber } = byId.get(id).callFrame;
    const key = `${functionName || "(anonymous)"} ${file.split("/").pop()}:${lineNumber}`;
    self.set(key, (self.get(key) ?? 0) + dt);
  });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  console.log("top self time (main thread, whole run):");
  [...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([key, us]) =>
      console.log(
        `  ${((us / total) * 100).toFixed(1).padStart(5)}%  ${(us / 1000).toFixed(0).padStart(6)} ms  ${key}`,
      ),
    );
};
