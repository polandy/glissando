import { describe, expect, it } from "vitest";
import type { StoredMusic } from "../../library/stored-slideshow";
import {
  serverSlideshow,
  serverStoreHarness,
} from "../../server-library/testing/server-store-harness";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { serverRouteStore } from "../routes/slideshow-home";
import { Toaster } from "../toast/toaster";
import { SlideshowEditor } from "./slideshow-editor";

const EDITED_AT = new Date("2026-10-08T12:00:00Z");

describe("SlideshowEditor on a server slideshow, the playlist (ADR-0023)", () => {
  it("puts a removed song back on the server when its removal is undone", async () => {
    const harness = serverStoreHarness();
    const song = (musicId: string): StoredMusic => ({
      id: musicId,
      fileName: `${musicId}.mp3`,
      durationMs: 60_000,
      mimeType: "audio/mpeg",
    });
    const kept = song(harness.service.uploadMusic());
    const removed = song(harness.service.uploadMusic());
    const seeded = await harness.seed(serverSlideshow({ songs: [kept, removed] }));
    const toaster = new Toaster(new FakeScheduler());
    const errors: unknown[] = [];
    const refused: unknown[] = [];
    const editor = new SlideshowEditor(await harness.store.getSlideshow(seeded.id), {
      store: serverRouteStore(harness.store),
      focusOf: () => undefined,
      toaster,
      newId: () => "claim",
      now: () => EDITED_AT,
      onError: (error) => errors.push(error),
      onGone: () => errors.push("gone"),
      onRefused: (reason) => refused.push(reason),
      removedText: () => "Bild entfernt",
      addedText: () => "Bilder hinzugefügt",
      undoLabel: () => "Rückgängig",
      lastPictureText: () => "Das letzte Bild bleibt.",
      everyPictureText: () => "Mindestens ein Bild bleibt.",
      motionAutomaticText: () => "Bewegung wieder automatisch",
      durationAutomaticText: () => "Dauer wieder automatisch",
      transitionAutomaticText: () => "Übergang wieder automatisch",
      slideshowTransitionResetText: () => "Übergänge wieder auf Überblenden",
      portraitPicturesResetText: () => "Hochformatbilder wieder automatisch",
      lookResetText: () => "Look entfernt",
      moodResetText: () => "Stimmung wieder auf Eigene",
      moodNowCustomText: () => "Stimmung ist jetzt Eigene",
      songRemovedText: () => "Song entfernt",
      shuffledText: () => "",
      random: () => 0,
      automaticTitle: () => "Juli 2025",
      locale: () => "de-DE",
    });

    editor.removeSong(removed.id);
    await editor.settled();
    toaster.current?.action?.run();
    await editor.settled();

    const onServer = (await harness.client.getSlideshow(seeded.id)).document.slideshow.songs;
    expect(onServer.map(({ musicId }) => musicId)).toEqual([kept.id, removed.id]);
    expect(refused).toEqual([]);
    expect(errors).toEqual([]);
  });
});
