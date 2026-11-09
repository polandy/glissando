<script lang="ts">
  import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
  import type { PictureLength } from "../../library/picture-length";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import { getTranslator } from "../i18n/context";
  import BetweenSongsSection from "./BetweenSongsSection.svelte";
  import FadeSection from "./FadeSection.svelte";
  import type { ListenState } from "./listen-preview";
  import MoodPictureTimesSection from "./MoodPictureTimesSection.svelte";
  import type { MusicEditorView } from "./music-editor-view";
  import PictureChangesSection from "./PictureChangesSection.svelte";
  import type { PlaylistView } from "./playlist-view";
  import PictureLengthNotice from "./PictureLengthNotice.svelte";
  import RepeatMusicSection from "./RepeatMusicSection.svelte";
  import TrimSection from "./TrimSection.svelte";
  import VolumeSection from "./VolumeSection.svelte";

  /**
   * The music editor's panel: what is the slideshow's (the picture length, repeating, and with
   * the details the hand-over between songs), then, with the details, what is the selected
   * song's own (its excerpt, volume, picture changes and fades). On a phone the two groups are
   * grid items of the screen, ordered around the lane and waveform (`MusicEditorScreen`).
   */
  let {
    music,
    playlist,
    details,
    listening,
    onTrim,
    onFadeIn,
    onFadeOut,
    onVolume,
    onVolumeReset,
    onListenVolume,
    onToggleOriginal,
    onPictureChanges,
    onPictureLength,
    onSecondsPerPicture,
    onSetOwnPictureTimes,
    onBetweenSongs,
    onRepeatMusic,
  }: {
    music: MusicEditorView;
    playlist: PlaylistView;
    /** The "Details" switch: Between songs and the selected song's settings show only with it. */
    details: boolean;
    listening: ListenState | null;
    /** `undefined`: the whole track. */
    onTrim: (trim: MusicTrim | undefined) => void;
    /** `undefined`: automatic. */
    onFadeIn: (fadeMs: number | undefined) => void;
    onFadeOut: (fadeMs: number | undefined) => void;
    /** `undefined`: levelled. */
    onVolume: (volumeDb: number | undefined) => void;
    onVolumeReset: () => void;
    onListenVolume: () => void;
    onToggleOriginal: () => void;
    /** `undefined`: on the beat. */
    onPictureChanges: (changes: PictureChanges | undefined) => void;
    /** `undefined`: the pictures fill the music. */
    onPictureLength: (length: PictureLength | undefined) => void;
    onSecondsPerPicture: (seconds: number) => void;
    /** Leaves the slideshow's mood for its own picture times (MOOD.md). */
    onSetOwnPictureTimes: () => void;
    /** `undefined`: the songs crossfade. */
    onBetweenSongs: (between: BetweenSongs | undefined) => void;
    /** `undefined`: the playlist plays once (ADR-0047). */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="panel">
  <div class="group slideshow-group">
    <h2 class="group-title">{t("music.sectionSlideshow")}</h2>
    {#snippet notice()}
      <PictureLengthNotice {playlist} {onRepeatMusic} />
    {/snippet}
    {#if music.moodPictureLength !== undefined}
      <MoodPictureTimesSection
        moodPictureLength={music.moodPictureLength}
        {notice}
        {onSetOwnPictureTimes}
      />
    {:else}
      <PictureLengthSection
        {...music.pictureLength}
        {notice}
        {onPictureLength}
        {onSecondsPerPicture}
      />
    {/if}
    <RepeatMusicSection on={playlist.repeatMusic} {onRepeatMusic} />
    {#if details && playlist.songCount > 1}
      <BetweenSongsSection crossfade={playlist.crossfade} {onBetweenSongs} />
    {/if}
  </div>
  {#if details}
    <div class="group song-group">
      <h2 class="group-title">{t("music.sectionSong", { number: music.songNumber })}</h2>
      {#if !music.reached}
        <p class="unreached">{t("music.songNotReached")}</p>
      {/if}
      <TrimSection {music} {onTrim} onReset={() => onTrim(undefined)} />
      <VolumeSection
        volume={music.volume}
        {listening}
        {onVolume}
        onReset={onVolumeReset}
        onListen={onListenVolume}
        {onToggleOriginal}
      />
      <PictureChangesSection view={music.pictureChanges} {onPictureChanges} />
      <FadeSection
        direction="in"
        fade={music.fadeIn}
        audibleEndMs={music.audibleEndMs}
        onFade={onFadeIn}
        onReset={() => onFadeIn(undefined)}
      />
      <FadeSection
        direction="out"
        fade={music.fadeOut}
        audibleEndMs={music.audibleEndMs}
        onFade={onFadeOut}
        onReset={() => onFadeOut(undefined)}
      />
    </div>
  {/if}
</div>

<style>
  .panel {
    display: grid;
    align-content: start;
    gap: 18px;
    min-height: 0;
    padding: 20px;
    overflow: auto;
    border-left: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  .group {
    display: grid;
    gap: 18px;
  }
  .group > :global(section + section) {
    padding-top: 18px;
    border-top: 1px solid var(--gl-line);
  }
  .group-title {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: var(--gl-tracking-eyebrow);
    text-transform: uppercase;
  }
  .song-group {
    margin-top: 6px;
    padding-top: 18px;
    border-top: 1px solid var(--gl-line);
  }
  .unreached {
    margin: 0;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-lemon) 18%, var(--gl-surface));
    font-size: var(--gl-size-meta);
  }
  @container (max-width: 720px) {
    /* The groups become grid items of the screen, ordered around the lane and waveform. */
    .panel {
      display: contents;
    }
    .group {
      padding-top: 16px;
      border-top: 1px solid var(--gl-line);
    }
    .slideshow-group {
      order: 3;
    }
    .song-group {
      order: 5;
      margin-top: 0;
    }
  }
</style>
