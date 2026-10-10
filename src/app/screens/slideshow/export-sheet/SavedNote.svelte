<script lang="ts">
  import Icon from "../../../components/Icon.svelte";

  /** The mint note of a file already saved where the user picked. */
  let { title, text }: { title: string; text: string } = $props();
</script>

<p class="saved" role="status">
  <Icon name="check" /><span><b>{title}</b> {text}</span>
</p>

<style>
  .saved {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 0;
    padding: 11px 14px;
    border: 1px solid color-mix(in srgb, var(--gl-mint) 55%, var(--gl-line));
    border-radius: var(--gl-radius);
    background: color-mix(in srgb, var(--gl-mint) 18%, var(--gl-surface));
    line-height: 1.45;
  }
  b {
    font-weight: var(--gl-weight-semibold);
  }
</style>
