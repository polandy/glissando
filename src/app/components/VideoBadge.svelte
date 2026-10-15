<script lang="ts">
  import Icon from "./Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /** The mark of a video tile: a play glyph and, where known, its length in the film. */
  let { durationMs }: { durationMs: number | null } = $props();

  const { t, formatDuration } = getTranslator();
  const MS_PER_SECOND = 1000;
  const length = $derived(
    durationMs === null ? null : formatDuration(Math.round(durationMs / MS_PER_SECOND)),
  );
</script>

<span class="video-badge mono" title={length === null ? t("clip.badge") : undefined}>
  <Icon name="play" />
  {#if length !== null}
    <span aria-hidden="true">{length}</span>
    <span class="sr-only">{t("clip.badgeLength", { length })}</span>
  {:else}
    <span class="sr-only">{t("clip.badge")}</span>
  {/if}
</span>

<style>
  .video-badge {
    --gl-icon-size: var(--gl-size-caption);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
