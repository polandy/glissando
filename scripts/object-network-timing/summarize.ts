// The statistics and the markdown table of the object-network timing run (run.mjs).

export interface Summary {
  readonly runs: number;
  readonly min: number;
  readonly median: number;
  readonly p95: number;
}

export interface TimingRow {
  readonly runner: string;
  readonly throttle: number;
  readonly summary: Summary;
}

const MEDIAN_RANK = 0.5;
const TAIL_RANK = 0.95;

/** Nearest-rank percentile of an ascending list, `rank` in (0, 1]. */
function percentile(sorted: readonly number[], rank: number): number {
  return sorted[Math.max(0, Math.ceil(rank * sorted.length) - 1)] ?? 0;
}

export function summarize(samples: readonly number[]): Summary {
  if (samples.length === 0) throw new RangeError("No samples to summarize");
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? percentile(sorted, MEDIAN_RANK)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  return {
    runs: sorted.length,
    min: sorted[0] ?? 0,
    median,
    p95: percentile(sorted, TAIL_RANK),
  };
}

export function timingTable(rows: readonly TimingRow[]): string {
  const ms = (value: number): string => value.toFixed(1);
  return [
    "| runner | CPU throttle | runs | min ms | median ms | p95 ms |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      ({ runner, throttle, summary: { runs, min, median, p95 } }) =>
        `| ${runner} | ${throttle}× | ${runs} | ${ms(min)} | ${ms(median)} | ${ms(p95)} |`,
    ),
  ].join("\n");
}
