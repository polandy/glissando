<script lang="ts">
  import type { Snippet } from "svelte";
  import { MIN_SECONDS_PER_PICTURE } from "../../library/stored-slideshow";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { AfterAdding } from "./after-adding";

  /** "After adding": the slideshow's pictures, duration and share before → after. */
  let { after, children }: { after: AfterAdding; children?: Snippet } = $props();

  const { t, formatDuration, formatSeconds, formatTenthSeconds } = getTranslator();
</script>

<section class="card after">
  <h2 class="eyebrow">{t("add.afterTitle")}</h2>
  <dl class="rows">
    <div>
      <dt>{t("add.afterPictures")}</dt>
      <dd class="mono">
        {t("add.beforeAfter", { before: after.pictures.before, after: after.pictures.after })}
      </dd>
    </div>
    <div>
      <dt>{t("add.afterDuration")}</dt>
      <dd class="mono">
        {t("add.beforeAfter", {
          before: formatDuration(after.durationSeconds.before),
          after: formatDuration(after.durationSeconds.after),
        })}
      </dd>
    </div>
    {#if after.perPictureSeconds !== null}
      <div>
        <dt>{t("add.afterPerPicture")}</dt>
        <dd class="mono">
          {t("add.beforeAfter", {
            before: formatTenthSeconds(after.perPictureSeconds.before),
            after: formatTenthSeconds(after.perPictureSeconds.after),
          })}
        </dd>
      </div>
    {/if}
  </dl>
  {#if after.note.kind === "musicTooShort"}
    <Notice tone="warn">
      <b>{t("add.musicTooShort")}</b>
      {t("add.musicTooShortText", {
        seconds: formatSeconds(MIN_SECONDS_PER_PICTURE),
        total: formatDuration(after.durationSeconds.after),
        music: formatDuration(after.note.musicSeconds),
      })}
    </Notice>
  {:else if after.note.kind === "sharesMusic"}
    <p class="note">{t("add.sharesMusic")}</p>
  {:else}
    <p class="note">{t("add.noMusic", { seconds: formatSeconds(after.note.secondsPerPicture) })}</p>
  {/if}
  {@render children?.()}
</section>

<style>
  .after {
    display: grid;
    gap: 10px;
  }
  .after h2 {
    margin: 0;
  }
  .rows {
    display: grid;
    margin: 0;
  }
  .rows div {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--gl-line);
  }
  .rows dt {
    color: var(--gl-muted);
  }
  .rows dd {
    margin: 0;
    font-weight: var(--gl-weight-medium);
  }
  .note {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
