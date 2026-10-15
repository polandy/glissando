import type { InputAudioTrack, InputVideoTrack } from "mediabunny";

/** A clip's file opened for reading; its bytes are read from the `Blob` as the sinks ask. */
export interface OpenedClip {
  readonly video: InputVideoTrack;
  /** Null for a clip without sound. */
  readonly audio: InputAudioTrack | null;
  dispose(): void;
}

/** Null when the file holds no video track mediabunny can read. */
export async function openClipFile(blob: Blob): Promise<OpenedClip | null> {
  const { ALL_FORMATS, BlobSource, Input } = await import("./mediabunny-reader");
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const [video, audio] = await Promise.all([
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
    ]);
    if (video === null) {
      input.dispose();
      return null;
    }
    return { video, audio, dispose: () => input.dispose() };
  } catch {
    // A file mediabunny cannot parse has no track to decode.
    input.dispose();
    return null;
  }
}
