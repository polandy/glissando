<script lang="ts">
  import { CARD_STYLE_SPECS } from "../../../../player/card-style-table";
  import { CARD_STYLES, type CardStyle } from "../../../../player/slideshow";
  import SectionHead from "../../../components/SectionHead.svelte";
  import { radioIndexForKey } from "../../../components/radio-keys";
  import { getTranslator } from "../../../i18n/context";

  /** The card sheet's Style radiogroup (TITLE_SLIDES.md): four cards, each "Aa" in its style. */
  let {
    style,
    onChange,
  }: {
    style: CardStyle;
    onChange: (style: CardStyle) => void;
  } = $props();

  const { t } = getTranslator();
  const radios: HTMLButtonElement[] = $state([]);

  function fontDeclaration(choice: CardStyle, part: "title" | "subtitle"): string {
    const spec = CARD_STYLE_SPECS[choice][part];
    return `font-family: ${spec.fontFamily}; font-weight: ${spec.fontWeight}; font-style: ${spec.italic ? "italic" : "normal"};`;
  }

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, CARD_STYLES.length);
    const choice = next === null ? undefined : CARD_STYLES[next];
    if (next === null || choice === undefined) {
      return;
    }
    event.preventDefault();
    onChange(choice);
    radios[next]?.focus();
  }
</script>

<section class="styles">
  <SectionHead id="card-style-title" title={t("cards.styleLabel")} own={false} />
  <div class="options" role="radiogroup" aria-labelledby="card-style-title">
    {#each CARD_STYLES as choice, index (choice)}
      <button
        bind:this={radios[index]}
        class="option"
        class:checked={choice === style}
        type="button"
        role="radio"
        aria-checked={choice === style}
        tabindex={choice === style ? 0 : -1}
        onclick={() => onChange(choice)}
        onkeydown={(event) => onkeydown(event, index)}
      >
        <span class="preview" style={fontDeclaration(choice, "title")}>Aa</span>
        <span class="name">{t(`cards.style-${choice}`)}</span>
      </button>
    {/each}
  </div>
</section>

<style>
  .styles {
    display: grid;
    gap: 10px;
  }
  .options {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .option {
    display: grid;
    justify-items: center;
    gap: 6px;
    padding: 10px 4px;
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
  .option:focus-visible {
    outline: 3px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .preview {
    font-size: 22px;
  }
  .name {
    font-size: var(--gl-size-small);
  }
</style>
