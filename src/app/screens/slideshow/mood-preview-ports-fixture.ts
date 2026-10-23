import type { StoredSlideshow } from "../../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../../library/testing/memory-store";
import { MusicOutput } from "../../../player";
import type { MoodPreviewPorts } from "./mood-preview-ports";

/** A `MoodSheet`'s preview ports, for tests that don't care what they load. */
export function moodPreviewPortsFixture(
  stored: Partial<StoredSlideshow> = {},
  store: MemoryLibraryStore = new MemoryLibraryStore(),
): MoodPreviewPorts {
  return {
    store,
    stored: {
      id: "s1",
      title: "Sommer am See",
      createdAt: "2025-07-01T00:00:00Z",
      pictures: [],
      songs: [],
      secondsPerPicture: 5,
      ...stored,
    },
    musicOutput: new MusicOutput(() => null),
    decodeClipSound: () => Promise.resolve(null),
    log: () => {},
  };
}
