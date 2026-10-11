import type { ConvertMusic } from "../../import/music-conversion";
import { UnconvertibleMusicError } from "../../import/music-conversion";
import { recogniseMusicFormat, type ConvertibleSource } from "../../import/music-format";
import { UnreadableMusicError, type MusicProbe } from "../../import/music-probe";

/** What reads a picked music file: its probe, its FLAC conversion (ADR-0020) and the log. */
export interface MusicPickPorts {
  probeMusic(file: File): Promise<MusicProbe>;
  readonly convertMusic: ConvertMusic;
  log(error: unknown): void;
}

/** Music ready for the slideshow: the picked file, or its FLAC copy (ADR-0020). */
export interface ChosenMusic {
  readonly kind: "chosen";
  readonly file: File;
  readonly pickedName: string;
  readonly durationMs: number;
  readonly convertedFrom: ConvertibleSource | null;
}

/** A picked file that cannot be used as music. */
export interface UnusableMusic {
  readonly kind: "unusable";
  readonly pickedName: string;
  readonly reason: "unreadable" | "protected";
}

/** Music being converted on this device. */
export interface ConvertingMusic {
  readonly kind: "converting";
  readonly pickedName: string;
  readonly source: ConvertibleSource;
  /** From 0 to 1. */
  readonly progress: number;
}

/**
 * Reads a picked file as music: the file itself, or its FLAC copy when a target browser cannot
 * decode it, telling `onConverting` how far the conversion is; music that cannot be read is
 * `unusable`. An abort of `signal` cancels the conversion and rejects.
 */
export async function readPickedMusic(
  file: File,
  ports: MusicPickPorts,
  onConverting: (converting: ConvertingMusic) => void,
  signal: AbortSignal,
): Promise<ChosenMusic | UnusableMusic> {
  const unusable = (reason: UnusableMusic["reason"]): UnusableMusic => ({
    kind: "unusable",
    pickedName: file.name,
    reason,
  });
  try {
    const format = await recogniseMusicFormat(file);
    if (format.kind === "protected") return unusable("protected");
    let playable = file;
    if (format.kind === "convertible") {
      const converting = (progress: number): ConvertingMusic => ({
        kind: "converting",
        pickedName: file.name,
        source: format.source,
        progress,
      });
      onConverting(converting(0));
      playable = await ports.convertMusic(
        file,
        (progress) => onConverting(converting(progress)),
        signal,
      );
    }
    const { durationMs } = await ports.probeMusic(playable);
    return {
      kind: "chosen",
      file: playable,
      pickedName: file.name,
      durationMs,
      convertedFrom: format.kind === "convertible" ? format.source : null,
    };
  } catch (error) {
    if (error instanceof UnconvertibleMusicError) {
      // The decoder's reason stays in the log; the user sees the file is unusable.
      ports.log(error);
      return unusable("unreadable");
    }
    if (error instanceof UnreadableMusicError) return unusable("unreadable");
    throw error;
  }
}
