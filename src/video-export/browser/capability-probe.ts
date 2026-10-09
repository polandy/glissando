import type { CapabilityProbe } from "../capabilities";

/** The browser's own answers: WebCodecs' `isConfigSupported` and a trial WebGL2 context. */
export function browserCapabilityProbe(): CapabilityProbe {
  const hasVideoEncoder = typeof VideoEncoder !== "undefined";
  const hasAudioEncoder = typeof AudioEncoder !== "undefined";
  return {
    hasVideoEncoder,
    hasWebGl2: hasWebGl2(),
    isVideoConfigSupported: async (config) =>
      hasVideoEncoder && (await VideoEncoder.isConfigSupported(config)).supported === true,
    isAudioConfigSupported: async (config) =>
      hasAudioEncoder && (await AudioEncoder.isConfigSupported(config)).supported === true,
  };
}

function hasWebGl2(): boolean {
  const gl = document.createElement("canvas").getContext("webgl2");
  // Contexts are few; this one was only a question.
  gl?.getExtension("WEBGL_lose_context")?.loseContext();
  return gl !== null;
}
