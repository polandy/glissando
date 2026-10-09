import { MILLISECONDS_PER_SECOND } from "../../player";

/** The ruler's label steps, the smallest that leaves each label room. */
const RULER_STEPS_MS = [10, 15, 30, 60, 120, 300, 600].map(
  (seconds) => seconds * MILLISECONDS_PER_SECOND,
);
/** The room one ruler label needs. */
const RULER_LABEL_PX = 60;
/** A tick closer than this share of a step to the end label gives way to it. */
const END_LABEL_ROOM = 0.5;

/** Where the ruler under a waveform `widthPx` wide labels a track `durationMs` long. */
export function rulerTicksMs(durationMs: number, widthPx: number): number[] {
  const labels = Math.max(1, Math.floor(widthPx / RULER_LABEL_PX));
  const stepMs =
    RULER_STEPS_MS.find((step) => durationMs / step <= labels) ?? (RULER_STEPS_MS.at(-1) as number);
  const ticks: number[] = [];
  for (let atMs = 0; atMs <= durationMs - stepMs * END_LABEL_ROOM; atMs += stepMs) {
    ticks.push(atMs);
  }
  return [...ticks, durationMs];
}

const BAR_PITCH_PX = 5;
const MIN_BARS = 40;
const MAX_BARS = 200;

/** How many bars a waveform `widthPx` wide draws. */
export function barCountFor(widthPx: number): number {
  return Math.min(MAX_BARS, Math.max(MIN_BARS, Math.round(widthPx / BAR_PITCH_PX)));
}

/** `ms` of a track `durationMs` long as a CSS percentage. */
export function percentOf(ms: number, durationMs: number): string {
  return `${(ms / durationMs) * 100}%`;
}
