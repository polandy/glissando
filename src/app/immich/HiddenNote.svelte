<script lang="ts">
  import { getTranslator } from "../i18n/context";

  /** "12 not JPEG, hidden" with the number in mono. */
  let { count }: { count: number } = $props();

  const { t } = getTranslator();
  const text = $derived(t("immich.notJpegHidden", { count }));
  const at = $derived(Math.max(text.indexOf(String(count)), 0));
  const before = $derived(text.slice(0, at));
  const after = $derived(text.slice(at + String(count).length));
</script>

<span class="note">{before}<span class="mono">{count}</span>{after}</span>

<style>
  .note {
    color: var(--gl-faint);
    font-size: var(--gl-size-small);
  }
</style>
