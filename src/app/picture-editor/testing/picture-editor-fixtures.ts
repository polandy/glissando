import type { MusicBeats } from "../../../beats";
import type { StoredPicture, StoredSlideshow } from "../../../library/stored-slideshow";

/** A slideshow of three pictures, the second with an own motion and a caption. */
export const own = {
  from: { zoom: 2, centerX: 0.3, centerY: 0.5 },
  to: { zoom: 1, centerX: 0.5, centerY: 0.5 },
};
export const stored: StoredSlideshow = {
  id: "show",
  title: "Juli 2025",
  createdAt: "2026-10-08T12:00:00Z",
  pictures: [
    { id: "p1", capturedAt: "2025-07-01T10:00:00Z", width: 300, height: 200, fileName: "a.jpg" },
    {
      id: "p2",
      capturedAt: "2025-07-02T10:00:00Z",
      width: 300,
      height: 200,
      fileName: "b.jpg",
      kenBurns: own,
      caption: "Am Steg",
    },
    { id: "p3", capturedAt: "2025-07-03T10:00:00Z", width: 200, height: 300, fileName: "c.jpg" },
  ],
  secondsPerPicture: 4,
};

export function withPicture(index: number, changes: Partial<StoredPicture>): StoredSlideshow {
  return {
    ...stored,
    pictures: stored.pictures.map((picture, at) =>
      at === index ? { ...picture, ...changes } : picture,
    ),
  };
}

export function music(durationMs: number) {
  return { id: "m", fileName: "m.mp3", durationMs, mimeType: "audio/mpeg" };
}

/** A beat every 400 ms from 100 ms on, across a 30 s track. */
export const STEADY_BEATS: MusicBeats = {
  kind: "beats",
  beatsMs: Array.from({ length: 75 }, (_, beat) => 100 + beat * 400),
  beatsPerMinute: 150,
};
