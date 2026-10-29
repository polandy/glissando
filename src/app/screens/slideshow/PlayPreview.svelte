<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";

  /** The slideshow's cover with a "Play · running time" pill; a tap anywhere plays it. */
  let {
    coverUrl,
    durationSeconds,
    onPlay,
  }: { coverUrl: string; durationSeconds: number; onPlay: () => void } = $props();

  const { t, formatDuration } = getTranslator();
</script>

<button class="preview" type="button" aria-label={t("slideshow.play")} onclick={onPlay}>
  <img src={coverUrl} alt="" />
  <span class="pill">
    <Icon name="play" />{t("slideshow.play")}
    <span class="mono">{` · ${formatDuration(durationSeconds)}`}</span>
  </span>
</button>

<style>
  .preview {
    position: relative;
    aspect-ratio: 16 / 9;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: var(--gl-radius-large);
    background: var(--gl-hover);
    cursor: pointer;
  }
  .preview img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .preview::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(120% 90% at 50% 40%, transparent 55%, var(--gl-photo-vignette));
  }
  .pill {
    position: absolute;
    left: 14px;
    bottom: 12px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font-size: var(--gl-size-small);
    font-weight: 500;
  }
</style>
