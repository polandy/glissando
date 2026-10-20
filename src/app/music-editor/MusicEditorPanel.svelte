<script lang="ts">
  import type { BetweenSongs, MusicTrim, PictureChanges } from "../../library/own-music";
  import type { PictureLength } from "../../library/picture-length";
  import PictureLengthSection from "../components/PictureLengthSection.svelte";
  import { getTranslator } from "../i18n/context";
  import BetweenSongsSection from "./BetweenSongsSection.svelte";
  import FadeSection from "./FadeSection.svelte";
  import type { ListenState } from "./listen-preview";
  import type { MusicEditorView } from "./music-editor-view";
  import PictureChangesSection from "./PictureChangesSection.svelte";
  import type { PlaylistView } from "./playlist-view";
  import TimingNote from "./TimingNote.svelte";
  import TrimSection from "./TrimSection.svelte";
  import VolumeSection from "./VolumeSection.svelte";

  /**
   * The music editor's panel: what is the slideshow's (the picture length, the hand-over between
   * songs), then what is the selected song's own (its excerpt, picture changes and fades).
   */
  let {
    music,
    playlist,
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
    onBetweenSongs,
  }: {
    music: MusicEditorView;
    playlist: PlaylistView;
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
    /** `undefined`: the songs crossfade. */
    onBetweenSongs: (between: BetweenSongs | undefined) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="panel">
  <h2 class="group-title">{t("music.sectionSlideshow")}</h2>
  <PictureLengthSection {...music.pictureLength} {onPictureLength} {onSecondsPerPicture} />
  {#if playlist.songs.length > 1}
    <BetweenSongsSection crossfade={playlist.crossfade} {onBetweenSongs} />
  {/if}
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
  <TimingNote note={music.note} />
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
  .panel > :global(section + section) {
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
  .group-title:not(:first-child) {
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
    .panel {
      padding: 16px;
      overflow: visible;
      border-top: 1px solid var(--gl-line);
      border-left: 0;
    }
  }
</style>
