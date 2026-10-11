<script lang="ts">
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MusicChoice } from "./import-session";

  /** Stays in the drop zone's place until other music is picked or the slideshow is created. */
  let {
    music,
    onPickOther,
  }: {
    music: Extract<MusicChoice, { kind: "unusable" }>;
    onPickOther: () => void;
  } = $props();

  const { t } = getTranslator();
  const name = $derived(music.pickedName);
</script>

<Notice tone="error">
  <b>{t("import.musicUnusable")}</b>
  <p>
    {music.reason === "protected"
      ? t("import.musicProtectedText", { name })
      : t("import.musicUnreadableText", { name })}
  </p>
  {#snippet actions()}
    <button class="btn primary" type="button" onclick={onPickOther}>
      {t("import.pickOtherMusic")}
    </button>
    <span class="formats">{t("import.musicFormats")}</span>
  {/snippet}
</Notice>

<style>
  b {
    display: block;
    font-weight: var(--gl-weight-semibold);
  }
  p {
    margin: 4px 0 0;
  }
  .formats {
    flex-basis: 100%;
    font-size: var(--gl-size-small);
    color: var(--gl-faint);
  }
</style>
