// The worker side of `WorkerLoudnessMeter`: measures each decoded track's loudness, off the main
// thread (ADR-0040). Typed with the DOM lib, whose `self` covers what a dedicated worker uses here.
import { measureLoudness } from "./measure-loudness";
import type { LoudnessReply, LoudnessRequest } from "./loudness-worker-protocol";

self.addEventListener("message", (event: MessageEvent<LoudnessRequest>) => {
  self.postMessage(answer(event.data));
});

function answer({ id, channels, sampleRate }: LoudnessRequest): LoudnessReply {
  try {
    return { id, kind: "found", loudness: measureLoudness(channels, sampleRate) };
  } catch (error) {
    return { id, kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}
