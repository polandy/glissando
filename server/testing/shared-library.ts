import type { ServerDocument } from "../../src/server-library/server-document";
import { libraryHarness, sampleDocument } from "./library-harness";

export const SLIDESHOWS = "/api/library/slideshows";
export const shareOf = (id: string) => `${SLIDESHOWS}/${id}/share`;
export const SECOND_ASSET = "1c6b8d4f-2e3a-4f7b-8c9d-8e7f6a5b4c3d";

/** A slideshow of two pictures and two songs, the second song with beats found. */
export function sharedLibrary() {
  const library = libraryHarness();
  const firstMusic = library.uploadMusic("audio/mp4");
  const secondMusic = library.uploadMusic("audio/mpeg");
  const base = sampleDocument("Herbst in Wien", firstMusic);
  const document: ServerDocument = {
    ...base,
    slideshow: {
      ...base.slideshow,
      pictures: [
        ...base.slideshow.pictures,
        {
          capturedAt: "2025-10-02T18:30:00Z",
          width: 1080,
          height: 1920,
          fileName: "b.jpg",
          immichAssetId: SECOND_ASSET,
          colours: { veil: "#404040", accent: "#C0C0C0" },
        },
      ],
      songs: [
        ...base.slideshow.songs,
        { musicId: secondMusic, fileName: "second.mp3", durationMs: 30000, mimeType: "audio/mpeg" },
      ],
    },
  };
  library.send("PUT", `/api/library/music/${secondMusic}/beats`, { body: { kind: "none" } });
  library.send("PUT", `/api/library/music/${firstMusic}/loudness`, {
    body: { blockLoudnessDb: [-20], hopPeaksDbfs: [-10, -10, -10, -10] },
  });
  const id = library.create(document);
  const token = String(library.send("POST", shareOf(id), { body: {} }).json["token"]);
  return { library, id, token, firstMusic, secondMusic };
}
