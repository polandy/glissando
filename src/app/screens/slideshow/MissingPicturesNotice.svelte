<script lang="ts">
  import Notice from "../../components/Notice.svelte";
  import { getTranslator } from "../../i18n/context";

  /** Below the strip of a server slideshow some of whose pictures Immich no longer has. */
  let { count, onRemove }: { count: number; onRemove: () => void } = $props();

  const { t } = getTranslator();
</script>

<Notice tone="warn">
  {t("server.missingNotice", { count })}
  {#snippet actions()}
    <button class="btn" type="button" onclick={onRemove}>
      {t("server.removeMissing", { count })}
    </button>
  {/snippet}
</Notice>
