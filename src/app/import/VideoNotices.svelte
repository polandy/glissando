<script lang="ts">
  import {
    MAX_VIDEO_BYTES,
    MAX_VIDEO_EXCERPT_MS,
    MIN_VIDEO_EXCERPT_MS,
  } from "../../library/own-video";
  import type { VideoRefusal } from "../../import/video-refusal";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import type { RefusedVideo } from "./import-view";

  /** Where the videos of a pick went wrong or need a word: each refusal and the long clips. */
  let {
    refused,
    longCount,
  }: {
    refused: readonly RefusedVideo[];
    /** How many chosen videos are longer than an excerpt can be. */
    longCount: number;
  } = $props();

  const MS_PER_SECOND = 1000;
  const REFUSAL_LEADS = {
    videoUnplayable: "clip.refusedUnplayable",
    videoTooLarge: "clip.refusedTooLarge",
    videoTooShort: "clip.refusedTooShort",
  } as const satisfies Record<VideoRefusal, MessageKey>;
  const { t, formatDuration, formatBytes, formatTenthSeconds } = getTranslator();
</script>

{#each refused as { fileName, reason } (fileName)}
  <Notice tone="error">
    {t(REFUSAL_LEADS[reason], {
      fileName,
      max: formatBytes(MAX_VIDEO_BYTES),
      min: formatTenthSeconds(MIN_VIDEO_EXCERPT_MS / MS_PER_SECOND),
    })}
  </Notice>
{/each}
{#if longCount > 0}
  <Notice tone="warn">
    {t("clip.longNotice", {
      count: longCount,
      max: formatDuration(MAX_VIDEO_EXCERPT_MS / MS_PER_SECOND),
    })}
  </Notice>
{/if}
