<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  let { onCreate }: { onCreate: () => void } = $props();
  const { t } = getTranslator();
</script>

<button class="new" type="button" onclick={onCreate}>
  <Icon name="plus" />{t("start.newSlideshow")}
</button>

<style>
  .new {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 8px;
    min-height: 200px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .new:hover {
    border-color: var(--gl-accent);
    color: var(--gl-ink);
  }
</style>
