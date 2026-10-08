/** Shared set-up of the `SlideshowEditor` tests. */
import { MediaNotFoundError, type StoredSlideshow } from "../../library/stored-slideshow";
import { MemoryLibraryStore } from "../../library/testing/memory-store";
import { FakeScheduler } from "../testing/fake-scheduler";
import { Toaster } from "../toast/toaster";
import { SlideshowEditor } from "./slideshow-editor";

export function stored(ids: readonly string[]): StoredSlideshow {
  return {
    id: "show",
    title: "Juli 2025",
    createdAt: "2025-07-02T00:00:00Z",
    pictures: ids.map((id) => ({
      id,
      capturedAt: "2025-07-01T10:00:00Z",
      width: 100,
      height: 100,
      fileName: `${id}.jpg`,
    })),
    secondsPerPicture: 5,
  };
}

const EDITED_AT = new Date("2026-10-08T12:00:00Z");

/** A memory store that records the editing calls, in the order they were made. */
class RecordingStore extends MemoryLibraryStore {
  readonly calls: string[] = [];

  override claimMedia(claimId: string, startedAt: Date, mediaId: string): Promise<void> {
    this.calls.push(`claim ${mediaId}`);
    return super.claimMedia(claimId, startedAt, mediaId);
  }

  override releaseClaim(claimId: string): Promise<void> {
    this.calls.push("release");
    return super.releaseClaim(claimId);
  }

  override updateSlideshow(slideshow: StoredSlideshow): Promise<void> {
    this.calls.push(`update ${slideshow.pictures.map((picture) => picture.id).join("")}`);
    return super.updateSlideshow(slideshow);
  }
}

/** An editor over a stored slideshow whose pictures' media is stored too. */
export async function setUp(ids: readonly string[] = ["a", "b", "c", "d"]) {
  const scheduler = new FakeScheduler();
  const toaster = new Toaster(scheduler);
  const store = new RecordingStore();
  const errors: unknown[] = [];
  let gone = 0;
  const initial = stored(ids);
  for (const id of ids) {
    await store.putPicture(id, { display: new Blob([id]), thumbnail: new Blob([id]) });
  }
  await store.saveSlideshow(initial);
  let claims = 0;
  const editor = new SlideshowEditor(initial, {
    store,
    toaster,
    newId: () => `claim-${(claims += 1)}`,
    now: () => EDITED_AT,
    onError: (error) => errors.push(error),
    onGone: () => (gone += 1),
    removedText: (count) => (count === 1 ? "Bild entfernt" : `${count} Bilder entfernt`),
    undoLabel: () => "Rückgängig",
    lastPictureText: () => "Das letzte Bild bleibt.",
    motionAutomaticText: () => "Bewegung wieder automatisch",
    automaticTitle: () => "Juli 2025",
  });
  const order = () => editor.slideshow.pictures.map((picture) => picture.id);
  const storedOrder = async () => {
    await editor.settled();
    return (await store.getSlideshow("show")).pictures.map((picture) => picture.id);
  };
  const storedTitle = async () => {
    await editor.settled();
    return (await store.getSlideshow("show")).title;
  };
  /** Whether a clean-up, as any tab runs it, leaves the picture's media in place. */
  const mediaSurvivesCleanUp = async (id: string) => {
    await editor.settled();
    await store.deleteUnreferencedMedia(EDITED_AT);
    try {
      await store.pictureBlob(id);
      return true;
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        return false;
      }
      throw error;
    }
  };
  const goneCount = () => gone;
  const storedPicture = async (id: string) => {
    await editor.settled();
    return (await store.getSlideshow("show")).pictures.find((picture) => picture.id === id);
  };
  return {
    scheduler,
    toaster,
    store,
    editor,
    errors,
    order,
    storedOrder,
    storedTitle,
    storedPicture,
    mediaSurvivesCleanUp,
    goneCount,
  };
}
