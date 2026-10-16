<script lang="ts">
  import type { StoredVideo } from "../../library/own-video";
  import { DEFAULT_VIDEO_VOLUME } from "../../library/own-video";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
  import PictureNavigation from "../picture-editor/PictureNavigation.svelte";
  import type { PictureEditorView } from "../picture-editor/picture-editor-view";
  import type { Excerpt, Handle } from "./clip-excerpt";
  import ClipPreview from "./ClipPreview.svelte";
  import ClipSoundPanel from "./ClipSoundPanel.svelte";
  import ExcerptStrip from "./ExcerptStrip.svelte";

  /**
   * The clip editor of a video slide (ADR-0034): a preview, the excerpt between two handles, how
   * long it lasts in the film, and the clip's sound. Every change goes to its callback and is
   * stored at once; a drag is stored on release.
   */
  let {
    slide,
    video,
    slideshowTitle,
    posterUrl,
    videoUrl,
    saving,
    onBack,
    onOpen,
    onExcerpt,
    onVolume,
    onDuckMusic,
    onReset,
  }: {
    /** Where the slide is in the slideshow and what follows it. */
    slide: PictureEditorView;
    video: StoredVideo;
    slideshowTitle: string;
    posterUrl: string | null;
    /** The clip's object URL; null while it loads. */
    videoUrl: string | null;
    /** An edit is being stored. */
    saving: boolean;
    onBack: () => void;
    onOpen: (pictureId: string) => void;
    onExcerpt: (startMs: number, endMs: number) => void;
    onVolume: (volume: number) => void;
    onDuckMusic: (duck: boolean) => void;
    onReset: () => void;
  } = $props();

  const MS_PER_SECOND = 1000;
  const { t, formatTenths, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number): string => formatTenthSeconds(ms / MS_PER_SECOND);

  /** The mounted preview, so the strip's playhead line can seek it like the scrub slider does. */
  let preview: ClipPreview;
  /** The excerpt while a handle is being dragged; stored on release. */
  let draft = $state.raw<Excerpt | null>(null);
  /** The dragged or moved handle's frame to peek at; null once it is released. */
  let peekMs: number | null = $state(null);
  /** The player's place in the whole clip; null until the preview reports one. */
  let positionMs = $state<number | null>(null);
  const excerpt = $derived(draft ?? { startMs: video.startMs, endMs: video.endMs });
  const volume = $derived(video.volume ?? DEFAULT_VIDEO_VOLUME);
  // The slide's transition runs inside the excerpt's end, so it is told with the excerpt.
  const transitionMs = $derived(
    Math.min(slide.transition.durationMs, excerpt.endMs - excerpt.startMs),
  );

  function excerptChanged(next: Excerpt, final: boolean, handle: Handle): void {
    if (final) {
      peekMs = null;
      draft = null;
      onExcerpt(next.startMs, next.endMs);
    } else {
      peekMs = handle === "start" ? next.startMs : next.endMs;
      draft = next;
    }
  }
</script>

<div class="screen" aria-busy={saving}>
  <Header
    crumbs={[t("start.library"), slideshowTitle, t("clip.crumb", { number: slide.number })]}
    {onBack}
  >
    {#snippet actions()}
      <PictureNavigation picture={slide} {onOpen} />
    {/snippet}
  </Header>
  <main class="edit">
    <div class="stage">
      <ClipPreview
        bind:this={preview}
        {posterUrl}
        {videoUrl}
        startMs={excerpt.startMs}
        endMs={excerpt.endMs}
        {peekMs}
        {volume}
        onPosition={(clipMs) => (positionMs = clipMs)}
      />
      <ExcerptStrip
        sourceMs={video.sourceMs}
        {excerpt}
        {positionMs}
        onExcerpt={excerptChanged}
        onSeek={(clipMs) => preview.seek(clipMs)}
      />
      <dl class="times">
        <div>
          <dt>{t("clip.from")}</dt>
          <dd class="mono">{formatTenths(excerpt.startMs / MS_PER_SECOND)}</dd>
        </div>
        <div class="in-film">
          <dt class="sr-only">{t("clip.inFilm", { length: "" })}</dt>
          <dd class="mono" aria-live="polite">
            {t("clip.inFilm", { length: seconds(excerpt.endMs - excerpt.startMs) })}
          </dd>
        </div>
        <div>
          <dt>{t("clip.to")}</dt>
          <dd class="mono">{formatTenths(excerpt.endMs / MS_PER_SECOND)}</dd>
        </div>
      </dl>
    </div>
    <div class="panel">
      <ClipSoundPanel {volume} duckMusic={video.duckMusic !== false} {onVolume} {onDuckMusic} />
      {#if transitionMs > 0}
        <p class="note">{t("clip.transitionNote", { length: seconds(transitionMs) })}</p>
      {/if}
      <div class="foot">
        <button class="btn" type="button" onclick={onReset}>{t("clip.reset")}</button>
        <button class="btn primary" type="button" onclick={onBack}>{t("clip.done")}</button>
      </div>
    </div>
  </main>
</div>

<style>
  .edit {
    flex: 1 1 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 340px;
    min-height: 0;
  }
  .stage {
    display: grid;
    align-content: start;
    gap: 6px;
    min-width: 0;
    padding: 18px;
  }
  .panel {
    display: grid;
    align-content: start;
    gap: 16px;
    padding: 18px;
    border-left: 1px solid var(--gl-line);
    overflow-y: auto;
  }
  .times {
    display: flex;
    justify-content: space-between;
    margin: 0;
    padding: 0 14px;
    font-size: var(--gl-size-label);
  }
  .times div {
    display: flex;
    gap: 8px;
  }
  .times dt {
    color: var(--gl-muted);
  }
  .times dd {
    margin: 0;
    font-weight: var(--gl-weight-medium);
  }
  .in-film dd {
    color: var(--gl-ink);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .note {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .foot {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  @container (max-width: 720px) {
    /* The phone layout scrolls as one: the preview on top, the panel below. */
    .edit {
      flex: none;
      grid-template-columns: minmax(0, 1fr);
    }
    .stage {
      padding: 0 0 8px;
    }
    .panel {
      border-left: 0;
      padding: 14px;
    }
  }
</style>
