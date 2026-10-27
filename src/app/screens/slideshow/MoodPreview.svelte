<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { SongBeats } from "../../../compose/playlist";
  import type { SongLoudness } from "../../../compose/song-loudness";
  import type { PictureFocus } from "../../../library/picture-focus";
  import type { SlideshowMood } from "../../../library/slideshow-mood";
  import { storedSongBeats } from "../../beats/music-beats-known";
  import Icon from "../../components/Icon.svelte";
  import { bareFocus, NO_FOCUS_KNOWN } from "../../focus/pictures-focus";
  import { getTranslator } from "../../i18n/context";
  import { storedSongLoudness } from "../../loudness/music-loudness-composed";
  import { browserObjectUrls } from "../../media/object-urls";
  import { loadPlayerMusic } from "../../routes/route-loading";
  import { moodEnergyPacing } from "./mood-energy-pacing";
  import { moodName } from "./mood-text";
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
   * leaves this out while the slideshow has no pictures. `moodBpm` and `moodPending` are the same
   * ones the sheet's rows show (`slideshowMoodBpm`/`slideshowMoodTempoPending`), so the badge never
   * disagrees with them, and while they are still pending it never claims "no beat found".
   * `onLoaded`, once given, fires with the beats and loudness once they are loaded, so the Mood
   * sheet can draw the energy strip (ADR-0046) from the same analysis, instead of loading it twice.
   */
  let {
    ports,
    mood,
    moodBpm,
    moodPending,
    onLoaded,
  }: {
    ports: MoodPreviewPorts;
    mood: SlideshowMood | undefined;
    moodBpm: number | undefined;
    moodPending: boolean;
    onLoaded?: (loaded: { beats: SongBeats; loudness: SongLoudness }) => void;
  } = $props();

  const { t, language } = getTranslator();

  interface Loaded {
    readonly focus: ReadonlyMap<string, PictureFocus>;
    readonly beats: SongBeats;
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
      storedSongBeats(ports.store, ports.stored, ports.log),
      storedSongLoudness(ports.store, ports.stored, ports.log),
    ]).then(([music, focus, beats, loudness]) => {
      if (music === null) {
        return;
      }
      musicUrls = music.urls;
      loaded = { focus, beats, loudness, musicUrls: music.urls };
      onLoaded?.({ beats, loudness });
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
      loaded.beats,
      loaded.loudness,
      language,
    );
  });
  const previewSlideshow = $derived(
    composed === null ? null : soundOn ? composed : mutedPreviewSlideshow(composed),
  );
  const bpmText = $derived(
    moodBpm !== undefined
      ? t("mood.previewBpm", { bpm: Math.round(moodBpm) })
      : moodPending
        ? t("mood.previewPending")
        : t("mood.previewNoBeat"),
  );
  // The badge adds "· energy" only once a lift was actually found to play the preview around.
  const energyBadge = $derived(
    loaded !== null &&
      ports.stored.energyPacing === true &&
      moodEnergyPacing(ports.stored, mood, loaded.beats, loaded.loudness).firstLiftUnitIndex !==
        undefined,
  );
  const badgeText = $derived(
    energyBadge
      ? `${bpmText} · ${moodName(t, mood)} · ${t("mood.energyBadgeSuffix")}`
      : `${bpmText} · ${moodName(t, mood)}`,
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
    <span class="badge">{badgeText}</span>
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
  .badge {
    position: absolute;
    top: 8px;
    left: 8px;
    border-radius: var(--gl-radius-pill);
    padding: 4px 10px;
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
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
