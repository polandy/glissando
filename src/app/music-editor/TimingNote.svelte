<script lang="ts">
  import { MIN_OWN_DURATION_MS } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { TimingNote } from "./music-editor-view";

  /** How the pictures' times meet the excerpt; a warning when the slideshow outlasts it. */
  let { note }: { note: TimingNote } = $props();

  const { t, formatDuration, formatTenthSeconds, formatSeconds } = getTranslator();
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;
</script>

<div class="note" class:warn={note.kind === "outlasts"}>
  {#if note.kind === "outlasts"}
    <b>{t("music.noteOutlasts", { over: formatDuration(seconds(note.overMs)) })}</b>
    <span>
      {note.automaticCount > 0
        ? t("music.noteOutlastsWhy", {
            count: note.automaticCount,
            min: formatSeconds(seconds(MIN_OWN_DURATION_MS)),
          })
        : t("music.noteOutlastsAllOwn")}
    </span>
  {:else}
    <b>{t("music.pictureTimes")}</b>
    <span>
      {#if note.kind === "shared"}
        {t("music.noteShared", {
          count: note.automaticCount,
          share: formatTenthSeconds(seconds(note.shareMs)),
        })}
      {:else if note.kind === "ends-early"}
        {t("music.noteEndsEarly", { time: formatDuration(seconds(note.endsAtMs)) })}
      {:else}
        {t("music.noteEndsWithMusic")}
      {/if}
    </span>
  {/if}
</div>

<style>
  .note {
    display: grid;
    gap: 4px;
    padding: 10px 12px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    font-size: var(--gl-size-meta);
  }
  .note.warn {
    background: color-mix(in srgb, var(--gl-lemon) 22%, var(--gl-surface));
  }
  b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
