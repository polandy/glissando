<script lang="ts">
  import { getTranslator } from "../i18n/context";

  let { variant }: { variant: "start" | "strip" } = $props();
  const { t } = getTranslator();
  const COUNT = { start: 3, strip: 6 } as const;
</script>

<!-- Stands where the loaded content will be, so it is replaced in place. A busy region, not a
     live one: the toasts are the page's only live status. -->
<ul class="skeleton {variant}" aria-busy="true" aria-label={t("route.loading")}>
  {#each { length: COUNT[variant] }, index (index)}
    <li class={variant === "start" ? "slideshow" : "block"}>
      {#if variant === "start"}
        <span class="block cover"></span>
        <span class="block meta"></span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .skeleton {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  /* The start screen's card grid (`StartScreen.svelte`); the loading test holds both in step. */
  .start {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 18px;
  }
  /* A slideshow card's cover and its name-and-facts block, as tall as a real `SlideshowCard`. */
  .slideshow {
    display: grid;
    background: var(--gl-surface);
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    overflow: hidden;
  }
  .cover {
    aspect-ratio: 16 / 10;
  }
  .meta {
    height: 60px;
    background: none;
    animation: none;
  }
  /* The picture strip's tile grid (`PictureStrip.svelte`); the loading test holds both in step. */
  .strip {
    grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
    gap: 10px;
  }
  .strip .block {
    aspect-ratio: 4 / 3;
    border-radius: var(--gl-radius-tile);
  }
  .block {
    background: linear-gradient(
      90deg,
      var(--gl-line) 0%,
      color-mix(in srgb, var(--gl-line) 50%, var(--gl-surface)) 50%,
      var(--gl-line) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s linear infinite;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .block {
      animation: none;
    }
  }
  @container (max-width: 720px) {
    .start {
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .strip {
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
    }
  }
</style>
