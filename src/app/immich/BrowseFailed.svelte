<script lang="ts">
  import type { BrowseFailure } from "../../immich/browse-failure";
  import { getTranslator } from "../i18n/context";
  import BrowseState from "./BrowseState.svelte";
  import { browseFailureMessages } from "./immich-view";

  /**
   * A failed request in the Immich browser, named by its problem, with Try again — or Reload when
   * the owner's proxy wants a new sign-in, which only a reload can bring.
   */
  let {
    failure,
    onRetry,
    onReload,
  }: { failure: BrowseFailure; onRetry: () => void; onReload: () => void } = $props();

  const { t } = getTranslator();
  const messages = $derived(browseFailureMessages(failure));
</script>

<BrowseState icon="alert" title={t(messages.title)} text={t(messages.text)}>
  {#snippet action()}
    {#if failure === "signInExpired"}
      <button class="btn" type="button" onclick={onReload}>{t("immich.reload")}</button>
    {:else}
      <button class="btn" type="button" onclick={onRetry}>{t("immich.tryAgain")}</button>
    {/if}
  {/snippet}
</BrowseState>
