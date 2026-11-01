<script lang="ts">
  import type { SlideshowMood } from "../../../library/slideshow-mood";
  import { getTranslator } from "../../i18n/context";
  import { moodName, moodSubtitle } from "./mood-text";

  /** One tile of the Mood sheet's radiogroup: Calm, Lively or Custom, named and tagged (MOOD.md). */
  let {
    mood,
    checked,
    radio = $bindable(),
    onPick,
    onKeydown,
  }: {
    mood: SlideshowMood | undefined;
    checked: boolean;
    radio?: HTMLButtonElement | undefined;
    onPick: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  const { t } = getTranslator();
</script>

<button
  bind:this={radio}
  class="mood"
  type="button"
  role="radio"
  aria-checked={checked}
  tabindex={checked ? 0 : -1}
  data-choice={mood ?? "custom"}
  onclick={onPick}
  onkeydown={onKeydown}
>
  {moodName(t, mood)}
  <span class="tag">{moodSubtitle(t, mood)}</span>
</button>

<style>
  .mood {
    display: grid;
    gap: 3px;
    padding: 10px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    text-align: left;
    cursor: pointer;
    font-family: var(--gl-font-ui);
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
  }
  .mood:hover {
    background: var(--gl-hover);
  }
  .mood:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .mood[aria-checked="true"] {
    border-color: var(--gl-accent);
    box-shadow: 0 0 0 1px var(--gl-accent) inset;
    background: color-mix(in srgb, var(--gl-accent) 12%, var(--gl-surface));
  }
  .tag {
    color: var(--gl-muted);
    font-family: var(--gl-font-ui);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-regular);
  }
</style>
