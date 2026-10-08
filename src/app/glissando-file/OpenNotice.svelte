<script lang="ts">
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { OpenNotice } from "./open-flow";

  /** Why a file was not opened, with the ways out (dev-docs/APP.md, "Waiting and errors"). */
  let {
    notice,
    onPick,
    onCreate,
    onReload,
    onDismiss,
  }: {
    notice: OpenNotice;
    /** Opens the file picker again. */
    onPick: () => void;
    /** Offered with a foreign file; absent where the user already is in a new slideshow. */
    onCreate?: (() => void) | undefined;
    onReload: () => void;
    onDismiss: () => void;
  } = $props();

  const { t, formatBytes } = getTranslator();
  const name = $derived(notice.fileName);
  const problem = $derived(notice.problem);
</script>

<Notice tone="error" {onDismiss} {actions}>
  {#if problem.kind === "foreign"}
    <b>{t("glissandoFile.foreignTitle", { name })}</b>
    {t("glissandoFile.foreignText")}
  {:else if problem.kind === "damaged"}
    <b>{t("glissandoFile.damagedTitle", { name })}</b>
    {t("glissandoFile.damagedText")}
  {:else if problem.kind === "newer"}
    <b>{t("glissandoFile.newerTitle", { name })}</b>
    {t("glissandoFile.newerText")}
  {:else}
    <b>{t("glissandoFile.fullTitle")}</b>
    {problem.freeBytes === null
      ? t("glissandoFile.fullTextUnknown", { name })
      : t("glissandoFile.fullText", {
          name,
          needed: formatBytes(problem.neededBytes),
          free: formatBytes(problem.freeBytes),
        })}
  {/if}
</Notice>

{#snippet actions()}
  {#if problem.kind === "newer"}
    <button class="btn" type="button" onclick={onReload}>{t("glissandoFile.reloadApp")}</button>
  {:else}
    <button class="btn" type="button" onclick={onPick}>{t("glissandoFile.chooseAnother")}</button>
    {#if problem.kind === "foreign" && onCreate}
      <button class="btn ghost" type="button" onclick={onCreate}>
        {t("start.newSlideshow")}
      </button>
    {/if}
  {/if}
{/snippet}
