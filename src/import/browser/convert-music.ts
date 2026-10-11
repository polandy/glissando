import type { ConvertMusic } from "../music-conversion";

/** Loads the decoder with the first conversion, never with the app (ADR-0020). */
export const convertMusic: ConvertMusic = async (file, onProgress, signal) => {
  const { convertToFlac } = await import("./libav-flac");
  return convertToFlac(file, onProgress, signal);
};
