<script lang="ts">
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import { pictureLengthNotice, type NoticeInput } from "./picture-length-notice";

  /**
   * The picture-length section's one line: how the pictures meet the music, stated as the outcome.
   * While the music ends before the pictures and does not repeat, it offers "Repeat the music" as
   * a text link, and turns to the warning tint only for a large gap (ADR-0023, ADR-0047). "Add a
   * song" is the song list's alone.
   */
  let {
    playlist,
    onRepeatMusic,
  }: {
    playlist: NoticeInput;
    /** `undefined`: the playlist plays once. */
    onRepeatMusic: (repeatMusic: true | undefined) => void;
  } = $props();

  const { t, formatDuration, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number) => ms / MILLISECONDS_PER_SECOND;

  const notice = $derived(pictureLengthNotice(playlist));
</script>

<p
  class="length-notice"
  class:warning={notice.kind === "music-ends-early" && notice.tone === "warning"}
>
  {#if notice.kind === "music-ends-early"}
    {t("music.noticeMusicEndsEarly", { time: formatDuration(seconds(notice.overMs)) })}
    <button type="button" class="link" onclick={() => onRepeatMusic(true)}>
      {t("music.repeatMusic")}
    </button>
  {:else if notice.kind === "fitted"}
    {t("music.noticeFitted", { seconds: formatTenthSeconds(seconds(notice.shareMs)) })}
  {:else if notice.kind === "repeats"}
    {t("music.noticeRepeats", { duration: formatDuration(seconds(notice.slideshowMs)) })}
  {:else if notice.kind === "fades-out"}
    {t("music.noticeFadesOut", { duration: formatDuration(seconds(notice.slideshowMs)) })}
  {:else}
    {t("music.noticeEndsWithMusic", { duration: formatDuration(seconds(notice.slideshowMs)) })}
  {/if}
</p>

<style>
  .length-notice {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .length-notice.warning {
    padding: 8px 10px;
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-lemon) 22%, var(--gl-surface));
    color: var(--gl-ink);
  }
  .link {
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    text-decoration: underline;
    cursor: pointer;
  }
</style>
