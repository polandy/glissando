// The worker side of `WorkerMusicAnalyser`: measures each decoded track's loudness at its own rate
// and finds its beats in our own mono mix at the detection rate, off the main thread (ADR-0051).
// Typed with the DOM lib, whose `self` covers what a dedicated worker uses here.
import { DETECTION_SAMPLE_RATE, detectBeats } from "../beats";
import { measureLoudness } from "../loudness";
import type { AnalysisReply, AnalysisRequest } from "./analysis-worker-protocol";
import { mixToDetectionRate } from "./mix-to-detection-rate";

self.addEventListener("message", (event: MessageEvent<AnalysisRequest>) => {
  self.postMessage(answer(event.data));
});

function answer({ id, channels, sampleRate }: AnalysisRequest): AnalysisReply {
  try {
    const loudness = measureLoudness(channels, sampleRate);
    const mono = mixToDetectionRate(channels, sampleRate, DETECTION_SAMPLE_RATE);
    const beats = detectBeats(mono, DETECTION_SAMPLE_RATE);
    return { id, kind: "found", analysis: { beats, loudness } };
  } catch (error) {
    return { id, kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}
