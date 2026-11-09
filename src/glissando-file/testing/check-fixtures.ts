import type { GlissandoFileCheck } from "../check-glissando-file";
import { fakeMediaDecoders } from "./fake-media-decoders";
import { entryTexts, exportedFile } from "./glissando-fixtures";

export interface ExportedManifest {
  readonly slideshow: {
    readonly title: string;
    readonly pictures: readonly {
      readonly file: string;
      readonly thumbnail: string;
      readonly width: number;
      readonly height: number;
    }[];
    readonly songs: readonly { readonly file: string }[];
  };
}

/** The reason of a damaged check, or a thrown failure when the check was not "damaged". */
export function damagedReason(check: GlissandoFileCheck): string {
  if (check.kind !== "damaged") {
    throw new Error(`expected a damaged check, got ${check.kind}`);
  }
  return check.reason;
}

export const plentyOfSpace = {
  freeBytes: () => Promise.resolve(1e9),
  mediaDecoders: fakeMediaDecoders(),
};

export async function manifestText(
  change: (manifest: Record<string, unknown>) => unknown,
): Promise<string> {
  const file = await exportedFile();
  const manifest = JSON.parse((await entryTexts(file))["glissando.json"] ?? "{}") as Record<
    string,
    unknown
  >;
  return JSON.stringify(change(manifest));
}
