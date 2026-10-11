// The worker side of `WorkerBeatDetector`: finds the beats in each decoded track, off the main
// thread (ADR-0021). Typed with the DOM lib, whose `self` covers what a dedicated worker uses here.
import type { BeatReply, BeatRequest } from "./beat-worker-protocol";
import { detectBeats } from "./detect-beats";

self.addEventListener("message", (event: MessageEvent<BeatRequest>) => {
  self.postMessage(answer(event.data));
});

function answer({ id, samples, sampleRate }: BeatRequest): BeatReply {
  try {
    return { id, kind: "found", beats: detectBeats(samples, sampleRate) };
  } catch (error) {
    return { id, kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}
