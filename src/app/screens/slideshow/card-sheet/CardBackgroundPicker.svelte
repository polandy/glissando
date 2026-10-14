<script lang="ts">
  import {
    CARD_FADE_STEP,
    MAX_CARD_FADE,
    MIN_CARD_FADE,
    DEFAULT_CARD_FADE,
    DEFAULT_CARD_TINT,
  } from "../../../../library/stored-card";
  import type { CardColour, StoredCardBackground } from "../../../../library/stored-slideshow";
  import { CARD_SWATCHES, type CardSwatchId } from "../../../../player/card-palette";
  import SectionHead from "../../../components/SectionHead.svelte";
  import { getTranslator } from "../../../i18n/context";
  import type { PictureTile } from "../../view-models";

  /**
   * The card sheet's Background section (TITLE_SLIDES.md): Colour | Picture, the six swatches or
   * the slideshow's pictures, the Fade slider over a picture, and the Reveal (opening card) or
   * Fade in (closing card) toggle, also only over a picture.
   */
  let {
    background,
    motion,
    pictures,
    kind,
    onChange,
    onMotionChange,
  }: {
    background: StoredCardBackground;
    motion: boolean;
    pictures: readonly PictureTile[];
    /** Which motion toggle this card offers. */
    kind: "opening" | "closing";
    onChange: (background: StoredCardBackground) => void;
    onMotionChange: (motion: boolean) => void;
  } = $props();

  const { t } = getTranslator();
  const swatchIds = Object.keys(CARD_SWATCHES) as CardSwatchId[];

  function pickColour(colour: CardColour): void {
    onChange({ kind: "colour", colour });
  }

  function pickPicture(pictureId: string): void {
    onChange({
      kind: "picture",
      pictureId,
      fade: background.kind === "picture" ? background.fade : DEFAULT_CARD_FADE,
      tint: background.kind === "picture" ? background.tint : DEFAULT_CARD_TINT,
    });
  }

  function setFade(fade: number): void {
    if (background.kind === "picture") {
      onChange({ ...background, fade });
    }
  }

  const motionLabel = $derived(
    kind === "opening" ? t("cards.revealLabel") : t("cards.fadeInLabel"),
  );
</script>

<section class="background">
  <SectionHead id="card-background-title" title={t("cards.backgroundLabel")} own={false} />
  <div class="kind-toggle" role="radiogroup" aria-labelledby="card-background-title">
    <button
      class="option"
      class:checked={background.kind === "colour"}
      type="button"
      role="radio"
      aria-checked={background.kind === "colour"}
      onclick={() => pickColour(background.kind === "colour" ? background.colour : "plum")}
    >
      {t("cards.backgroundColour")}
    </button>
    <button
      class="option"
      class:checked={background.kind === "picture"}
      type="button"
      role="radio"
      aria-checked={background.kind === "picture"}
      onclick={() => pickPicture(pictures[0]?.id ?? "")}
      disabled={pictures.length === 0}
    >
      {t("cards.backgroundPicture")}
    </button>
  </div>

  {#if background.kind === "colour"}
    <div class="swatches" role="radiogroup" aria-label={t("cards.backgroundColour")}>
      {#each swatchIds as swatchId (swatchId)}
        <button
          class="swatch"
          class:checked={background.colour === swatchId}
          type="button"
          role="radio"
          aria-checked={background.colour === swatchId}
          aria-label={t(`cards.colour-${swatchId}`)}
          style:background={CARD_SWATCHES[swatchId]}
          onclick={() => pickColour(swatchId)}
        ></button>
      {/each}
    </div>
  {:else}
    <div class="pictures" role="radiogroup" aria-label={t("cards.backgroundPicture")}>
      {#each pictures as picture, index (picture.id)}
        <button
          class="picture"
          class:checked={background.pictureId === picture.id}
          type="button"
          role="radio"
          aria-checked={background.pictureId === picture.id}
          aria-label={t("cards.pictureOption", { number: index + 1 })}
          onclick={() => pickPicture(picture.id)}
        >
          <img src={picture.thumbnailUrl} alt="" draggable="false" />
        </button>
      {/each}
    </div>

    <div class="fade">
      <label class="eyebrow" for="card-fade">{t("cards.fadeLabel")}</label>
      <input
        id="card-fade"
        type="range"
        min={MIN_CARD_FADE}
        max={MAX_CARD_FADE}
        step={CARD_FADE_STEP}
        value={background.fade}
        oninput={(event) => setFade(event.currentTarget.valueAsNumber)}
      />
      <div class="fade-ends">
        <span>{t("cards.fadeSubtle")}</span>
        <span>{t("cards.fadeStrong")}</span>
      </div>
    </div>

    <label class="motion">
      <input
        type="checkbox"
        checked={motion}
        onchange={(event) => onMotionChange(event.currentTarget.checked)}
      />
      {motionLabel}
    </label>
  {/if}
</section>

<style>
  .background {
    display: grid;
    gap: 10px;
  }
  .kind-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .option {
    padding: 8px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: inherit;
    cursor: pointer;
  }
  .option.checked {
    border-color: var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 14%, var(--gl-raised));
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .swatch {
    aspect-ratio: 1;
    border: 2px solid var(--gl-line);
    border-radius: var(--gl-radius);
    cursor: pointer;
  }
  .swatch.checked {
    border-color: var(--gl-accent);
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .pictures {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
    gap: 6px;
  }
  .picture {
    aspect-ratio: 4 / 3;
    padding: 0;
    overflow: hidden;
    border: 2px solid transparent;
    border-radius: var(--gl-radius-small);
    cursor: pointer;
  }
  .picture.checked {
    border-color: var(--gl-accent);
  }
  .picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .fade {
    display: grid;
    gap: 4px;
  }
  .fade-ends {
    display: flex;
    justify-content: space-between;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .motion {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
