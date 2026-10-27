<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { SongBeats } from "../../../compose/playlist";
  import type { SongLoudness } from "../../../compose/song-loudness";
  import type { PictureFocus } from "../../../library/picture-focus";
  import type { SlideshowMood } from "../../../library/slideshow-mood";
  import Icon from "../../components/Icon.svelte";
  import { bareFocus, NO_FOCUS_KNOWN } from "../../focus/pictures-focus";
  import { getTranslator } from "../../i18n/context";
  import { storedSongLoudness } from "../../loudness/music-loudness-composed";
  import { browserObjectUrls } from "../../media/object-urls";
  import { loadPlayerMusic } from "../../routes/route-loading";
  import {
    moodPreviewSlideshow,
    mutedPreviewSlideshow,
    PREVIEW_PICTURE_COUNT,
  } from "./mood-preview-slideshow";
  import type { MoodPreviewPorts } from "./mood-preview-ports";
  import MoodPreviewPlayer from "./MoodPreviewPlayer.svelte";

  /**
   * The Mood sheet's live preview (MOOD.md): the real player on the slideshow's first four slide
   * units composed under `mood`, looping, silent until the "Sound" toggle is on. The caller
   * leaves this out while the slideshow has no pictures. `moodBeats` is the same pass-aware map
   * the sheet's tempo row is built from (`composedSongBeats`); the caller passes a new map once
   * the background beat pass finds a song's beats, and the preview then re-paces to it, since a
   * new `previewSlideshow` remounts the player (`{#key}` below). `onLoaded`, once given, fires
   * with the loudness once it is loaded, so the Mood sheet can draw the energy strip (ADR-0046)
   * from that and `moodBeats`, instead of loading loudness twice.
   */
  let {
    ports,
    mood,
    moodBeats,
    onLoaded,
  }: {
    ports: MoodPreviewPorts;
    mood: SlideshowMood | undefined;
    moodBeats: SongBeats;
    onLoaded?: (loaded: { loudness: SongLoudness }) => void;
  } = $props();

  const { t, language } = getTranslator();

  interface Loaded {
    readonly focus: ReadonlyMap<string, PictureFocus>;
    readonly loudness: SongLoudness;
    readonly musicUrls: ReadonlyMap<string, string>;
  }

  let loaded = $state.raw<Loaded | null>(null);
  let soundOn = $state(false);
  let musicUrls: ReadonlyMap<string, string> = new Map();
  const closed = new AbortController();

  onMount(() => {
    const previewPictureIds = ports.stored.pictures
      .slice(0, PREVIEW_PICTURE_COUNT)
      .map((picture) => picture.id);
    Promise.all([
      loadPlayerMusic(ports.store, ports.stored, browserObjectUrls.create, closed.signal),
      ports.store.pictureFocus(previewPictureIds).then(bareFocus, (error: unknown) => {
        ports.log(error);
        return NO_FOCUS_KNOWN.found;
      }),
      storedSongLoudness(ports.store, ports.stored, ports.log),
    ]).then(([music, focus, loudness]) => {
      if (music === null) {
        return;
      }
      musicUrls = music.urls;
      loaded = { focus, loudness, musicUrls: music.urls };
      onLoaded?.({ loudness });
    }, ports.log);
  });
  onDestroy(() => {
    closed.abort();
    for (const url of musicUrls.values()) {
      browserObjectUrls.revoke(url);
    }
  });

  const composed = $derived.by(() => {
    if (loaded === null) {
      return null;
    }
    const sources = {
      picture: (id: string) => id,
      video: (id: string) => id,
      music: (id: string) => {
        const url = loaded?.musicUrls.get(id);
        if (url === undefined) {
          throw new Error(`the mood preview plays song "${id}" but it was not loaded`);
        }
        return url;
      },
    };
    return moodPreviewSlideshow(
      ports.stored,
      mood,
      sources,
      loaded.focus,
      moodBeats,
      loaded.loudness,
      language,
    );
  });
  const previewSlideshow = $derived(
    composed === null ? null : soundOn ? composed : mutedPreviewSlideshow(composed),
  );
</script>

{#if previewSlideshow !== null}
  <div class="live">
    {#key previewSlideshow}
      <MoodPreviewPlayer
        slideshow={previewSlideshow}
        openPicture={(id) => ports.store.playbackPictureBlob(id)}
        readVideo={(id) => ports.store.videoBlob(id)}
        musicOutput={ports.musicOutput}
        decodeClipSound={ports.decodeClipSound}
        onError={ports.log}
      />
    {/key}
    <button
      class="sound"
      type="button"
      aria-pressed={soundOn}
      aria-label={t("mood.sound")}
      onclick={() => (soundOn = !soundOn)}
    >
      <Icon name={soundOn ? "volume" : "volumeOff"} />
    </button>
  </div>
{/if}

<style>
  .live {
    position: relative;
    aspect-ratio: 3 / 2;
    overflow: hidden;
    border-radius: var(--gl-radius-large);
    background: var(--gl-player-bg);
    color: var(--gl-player-text);
  }
  .sound {
    position: absolute;
    top: 8px;
    right: 8px;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    cursor: pointer;
  }
</style>
