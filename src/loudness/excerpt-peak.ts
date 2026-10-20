/**
 * The loudest sample peak inside an excerpt, from the stored per-hop peaks — no re-decoding
 * (dev-docs/library/MUSIC.md "Loudness levelling and song volume").
 */
import { LOUDNESS_HOP_MS, type MusicLoudness } from "./measure-loudness";

export function excerptPeakDbfs(m: MusicLoudness, startMs: number, endMs: number): number | null {
  let maxPeak = 0;
  for (let hop = 0; hop < m.hopPeaks.length; hop += 1) {
    const hopStartMs = hop * LOUDNESS_HOP_MS;
    const hopEndMs = hopStartMs + LOUDNESS_HOP_MS;
    const overlapsExcerpt = hopEndMs > startMs && hopStartMs < endMs;
    if (overlapsExcerpt) {
      maxPeak = Math.max(maxPeak, m.hopPeaks[hop] as number);
    }
  }
  return maxPeak > 0 ? 20 * Math.log10(maxPeak) : null;
}
