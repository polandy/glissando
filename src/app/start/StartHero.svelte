<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { DemoSlideshowState } from "./demo-slideshow-flow";
  import DemoSlideshowButton from "./DemoSlideshowButton.svelte";

  /** An empty library's welcome: the demo slideshow, a new slideshow, or a .glissando file. */
  let {
    demo,
    onCreate,
    onPickFile,
  }: {
    /** The "Load demo slideshow" button (dev-docs/app/INSTALLING_AND_OFFLINE.md). */
    demo: { visible: boolean; state: DemoSlideshowState; onLoad: () => void };
    onCreate: () => void;
    onPickFile: () => void;
  } = $props();

  const { t } = getTranslator();
</script>

<div class="hero">
  <h1 class="title">{t("start.heroTitle")}</h1>
  <p class="lead">{t("start.heroText")}</p>
  {#if demo.visible}
    <DemoSlideshowButton state={demo.state} onLoad={demo.onLoad} />
  {/if}
  <button class="btn primary large" type="button" onclick={onCreate}>
    <Icon name="plus" />{t("start.newSlideshow")}
  </button>
  <button class="btn ghost" type="button" onclick={onPickFile}>
    <Icon name="open" />{t("glissandoFile.openGlissandoFile")}
  </button>
</div>

<style>
  .hero {
    display: grid;
    justify-items: center;
    gap: 14px;
    max-width: 520px;
    margin: 0 auto;
    text-align: center;
  }
  .hero .lead {
    margin: 0;
  }
</style>
