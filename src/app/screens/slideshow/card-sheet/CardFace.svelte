<script lang="ts">
  import { onMount } from "svelte";
  import { BACKDROP_BLUR_RADIUS_SHARE } from "../../../../player/backdrop-blur";
  import { canvasCardMeasure } from "../../../../player/card-measure";
  import { cardStyles, type CardStyles } from "../../../../player/card-style";
  import { CARD_STYLE_SPECS, type CardTextSpec } from "../../../../player/card-style-table";
  import { cardTimingAt } from "../../../../player/card-timing";
  import { VEIL_CONTRAST_SHARE, VEIL_SATURATION_SHARE } from "../../../../player/card-veil";
  import { loadFonts, type FontSpec, type Fonts } from "../../../../player/fonts";
  import type { Card } from "../../../../player/slideshow";
  import { styleAttr, withDrift } from "./card-preview-model";

  /**
   * One title/closing card at `elapsedMs` into its timing (TITLE_SLIDES.md): the ground or
   * picture background, the veil, and the title/subtitle text, laid out and styled exactly as
   * `card-style.ts`/`card-timing.ts` draw it for the player. Pure presentation: the sheet's
   * sticky preview and the strip's tile still both mount this at their own size. `fonts` is the
   * style's face loader, injected so a test can settle it on its own terms instead of waiting
   * on a real font fetch.
   */
  let {
    card,
    ground,
    pictureUrl,
    elapsedMs,
    reducedMotion = false,
    fonts,
  }: {
    card: Card;
    ground?: string | undefined;
    pictureUrl?: string | undefined;
    elapsedMs: number;
    reducedMotion?: boolean;
    fonts: Fonts;
  } = $props();

  let host: HTMLDivElement;
  let stage = $state({ width: 0, height: 0 });

  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        stage = { width: entry.contentRect.width, height: entry.contentRect.height };
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  });

  // The style's fonts load once per style, not on every edit: a title/subtitle change still
  // reassigns `card`, but must not hide the text while an already-loaded font "reloads".
  let fontsReady = $state(false);
  let loadedStyle: Card["style"] | undefined;
  $effect(() => {
    const style = card.style;
    if (style === loadedStyle) {
      return;
    }
    loadedStyle = style;
    fontsReady = false;
    const spec = CARD_STYLE_SPECS[style];
    loadFonts(fonts, [toFontSpec(spec.title), toFontSpec(spec.subtitle)])
      .catch((error: unknown) => {
        console.error(`the ${style} card font did not load; it draws with a fallback font`, error);
      })
      .then(() => (fontsReady = true));
  });

  function toFontSpec(spec: CardTextSpec): FontSpec {
    return {
      family: spec.fontFamily,
      weight: spec.fontWeight,
      style: spec.italic ? "italic" : "normal",
    };
  }

  const styles = $derived<CardStyles | null>(
    stage.width === 0 || stage.height === 0 || !fontsReady
      ? null
      : cardStyles(
          card,
          stage,
          canvasCardMeasure(CARD_STYLE_SPECS[card.style].title, stage),
          canvasCardMeasure(CARD_STYLE_SPECS[card.style].subtitle, stage),
        ),
  );

  const timing = $derived(cardTimingAt(card, elapsedMs, reducedMotion));
  const veilTint = $derived(card.veil?.tint);
  const blurPx = $derived(BACKDROP_BLUR_RADIUS_SHARE * Math.max(stage.width, stage.height));
  const pictureFilter = $derived(
    timing.veilAmount <= 0
      ? "none"
      : `blur(${blurPx * timing.veilAmount}px) saturate(${1 - VEIL_SATURATION_SHARE * timing.veilAmount}) contrast(${1 - VEIL_CONTRAST_SHARE * timing.veilAmount})`,
  );
</script>

<div class="face" bind:this={host} data-testid="card-face">
  {#if ground !== undefined}
    <div class="ground" style:background={ground}></div>
  {:else if pictureUrl !== undefined}
    <img class="picture" src={pictureUrl} alt="" style:filter={pictureFilter} />
    {#if veilTint !== undefined && timing.veilAmount > 0}
      <div class="veil" style:background={veilTint} style:opacity={timing.veilAmount * 0.55}></div>
    {/if}
  {/if}
  {#if styles !== null}
    <div class="text" style:opacity={timing.textOpacity} aria-hidden="true">
      {#each styles.titleLines as line (line.text + "title")}
        <div style={styleAttr(withDrift(line.declarations, timing.driftEm))}>{line.text}</div>
      {/each}
      {#each styles.subtitleLines as line (line.text + "subtitle")}
        <div style={styleAttr(withDrift(line.declarations, timing.driftEm))}>{line.text}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .face {
    position: relative;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background: var(--gl-hover);
  }
  .ground,
  .picture,
  .veil {
    position: absolute;
    inset: 0;
  }
  .picture {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .text {
    position: absolute;
    inset: 0;
  }
</style>
