<script lang="ts">
  import { SEQUENCE_BETWEEN_SONGS, type BetweenSongs } from "../../library/own-music";
  import { radioIndexForKey } from "../components/radio-keys";
  import { getTranslator } from "../i18n/context";
  import InfoHead from "./InfoHead.svelte";

  /** How one song hands over to the next: a crossfade, the default, or one after another. */
  let {
    crossfade,
    onBetweenSongs,
  }: {
    crossfade: boolean;
    /** `undefined`: they crossfade. */
    onBetweenSongs: (between: BetweenSongs | undefined) => void;
  } = $props();

  const { t } = getTranslator();
  const HEAD_ID = "music-between-songs";
  const CHOICES = [
    { value: undefined, label: "music.crossfade" },
    { value: SEQUENCE_BETWEEN_SONGS, label: "music.sequence" },
  ] as const;

  const radios: HTMLButtonElement[] = $state([]);
  const selected = $derived(crossfade ? 0 : 1);

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, CHOICES.length);
    if (next === null) return;
    event.preventDefault();
    onBetweenSongs(CHOICES[next]?.value);
    radios[next]?.focus();
  }
</script>

<section class="section" aria-labelledby={HEAD_ID}>
  <InfoHead
    id={HEAD_ID}
    icon="transition"
    title={t("music.betweenSongs")}
    infoLabel={t("music.infoBetweenSongs")}
  >
    <p>{t("music.crossfadeWhy")}</p>
    <p>{t("music.sequenceWhy")}</p>
  </InfoHead>
  <div class="choices" role="radiogroup" aria-labelledby={HEAD_ID}>
    {#each CHOICES as choice, index (choice.label)}
      {@const checked = index === selected}
      <button
        bind:this={radios[index]}
        type="button"
        role="radio"
        aria-checked={checked}
        tabindex={checked ? 0 : -1}
        onclick={() => onBetweenSongs(choice.value)}
        onkeydown={(event) => onkeydown(event, index)}
      >
        {t(choice.label)}
      </button>
    {/each}
  </div>
</section>

<style>
  .section {
    display: grid;
    gap: 10px;
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .choices button {
    padding: 7px 6px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .choices button[aria-checked="true"] {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
  }
</style>
