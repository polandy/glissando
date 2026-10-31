<script lang="ts">
  import Notice from "../../../components/Notice.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { MessageKey } from "../../../i18n/messages";
  import type { ExportFailureDescription } from "../../../export-errors/describe-export-failure";

  type ClipKey = "exportErrors.clipVideoTitle" | "exportErrors.clipPageTitle";
  type ClipFreeKey = Exclude<MessageKey, ClipKey> & `exportErrors.${string}Title`;

  /**
   * An export that cannot go on: the sentence with its way out, the raw error one press away
   * (dev-docs/app/WAITING_AND_ERRORS.md). The session already reported the error.
   */
  let {
    description,
    onClose,
    onRetry,
    onChooseSize,
  }: {
    description: ExportFailureDescription;
    onClose: () => void;
    /** "Try again": the sheet returns to the size choice. */
    onRetry: () => void;
    /** "Choose another size": the same, with the smallest size selected. */
    onChooseSize: () => void;
  } = $props();

  const { t } = getTranslator();
  const detailsId = $props.id();
  let showDetails = $state(false);
  const tone = $derived(
    description.failure === "storage-full" || description.failure === "unknown" ? "error" : "warn",
  );
  const title = $derived(
    description.clip === null
      ? // Only the clip titles take a parameter, and they come with a clip number.
        t(description.title as ClipFreeKey)
      : t(description.title as ClipKey, { clip: description.clip }),
  );
</script>

<Notice {tone}>
  <b>{title}</b>
  {t(description.text)}
  {#if description.details !== ""}
    <button
      class="btn small ghost toggle"
      type="button"
      aria-expanded={showDetails}
      aria-controls={detailsId}
      onclick={() => (showDetails = !showDetails)}
    >
      {t(showDetails ? "exportErrors.hideDetails" : "exportErrors.showDetails")}
    </button>
    {#if showDetails}
      <code id={detailsId} class="details">{description.details}</code>
    {/if}
  {/if}
</Notice>
<footer>
  <button class="btn" class:ghost={description.action !== "close"} type="button" onclick={onClose}>
    {t("common.close")}
  </button>
  {#if description.action === "try-again"}
    <button class="btn primary" type="button" onclick={onRetry}>
      {t("exportErrors.tryAgain")}
    </button>
  {:else if description.action === "smaller-size"}
    <button class="btn primary" type="button" onclick={onChooseSize}>
      {t("exportErrors.smallerSize")}
    </button>
  {/if}
</footer>

<style>
  .toggle {
    display: block;
    margin-top: 6px;
  }
  .details {
    display: block;
    margin-top: 6px;
    color: var(--gl-muted);
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-small);
    overflow-wrap: anywhere;
  }
</style>
