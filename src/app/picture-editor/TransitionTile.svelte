<script lang="ts">
  import { CUT_TRANSITION, type TransitionChoice } from "../../library/own-timing";
  import { getTranslator } from "../i18n/context";
  import { tileProgress } from "./timing/preview-timeline";
  import { transitionStyles, type TransitionStyles } from "./timing/transition-styles";

  /** One choice of the transition radiogroup: a tiny loop of its effect into the next picture. */
  let {
    choice,
    checked,
    automatic,
    tagged,
    pictureUrl,
    nextPictureUrl,
    elapsedMs,
    radio = $bindable(),
    onPick,
    onKeydown,
  }: {
    choice: TransitionChoice;
    checked: boolean;
    /** The section is automatic: the checked tile's outline is dashed. */
    automatic: boolean;
    /** Carries the "Auto" tag: the automatic effect while the section is automatic. */
    tagged: boolean;
    pictureUrl: string | null;
    nextPictureUrl: string | null;
    /** Into the tiles' shared loop. */
    elapsedMs: number;
    radio?: HTMLButtonElement | undefined;
    onPick: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  const { t } = getTranslator();
  const HIDDEN = "0";

  let width = $state(0);
  let height = $state(0);
  const looks: TransitionStyles = $derived.by(() => {
    const progress = tileProgress(choice, elapsedMs);
    if (choice !== CUT_TRANSITION) {
      return transitionStyles(choice, progress, { width, height });
    }
    const still = transitionStyles("crossfade", 1, { width, height });
    return { ...still, to: { ...still.to, opacity: progress === 0 ? HIDDEN : still.to.opacity } };
  });

  function styled(declarations: Readonly<Record<string, string>>) {
    return (element: HTMLElement) => {
      Object.assign(element.style, declarations);
    };
  }
</script>

<button
  bind:this={radio}
  class="tile"
  class:automatic
  type="button"
  role="radio"
  aria-checked={checked}
  tabindex={checked ? 0 : -1}
  data-choice={choice}
  onclick={onPick}
  onkeydown={onKeydown}
>
  <span class="mini" bind:clientWidth={width} bind:clientHeight={height} aria-hidden="true">
    {#each [{ url: pictureUrl, look: looks.from }, { url: nextPictureUrl, look: looks.to }] as layer, index (index)}
      <span class="layer" {@attach styled({ ...layer.look })}>
        {#if layer.url !== null}<img src={layer.url} alt="" />{/if}
      </span>
    {/each}
    {#if choice === CUT_TRANSITION}<span class="cut-mark"><i></i></span>{/if}
    {#if tagged}<span class="tag">{t("editor.autoTag")}</span>{/if}
  </span>
  <span class="name">{t(`effect.${choice}`)}</span>
</button>

<style>
  .tile {
    display: grid;
    gap: 5px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-medium);
    text-align: center;
    cursor: pointer;
  }
  .tile:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 3px;
    border-radius: var(--gl-radius-small);
  }
  .mini {
    position: relative;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius-small);
    outline: 1.5px solid var(--gl-line);
    background: var(--gl-player-bg);
  }
  [aria-checked="true"] .mini {
    outline: 2.5px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .automatic[aria-checked="true"] .mini {
    outline-style: dashed;
  }
  .layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .cut-mark {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .cut-mark i {
    width: 2px;
    height: 70%;
    background: var(--gl-on-photo);
    transform: rotate(18deg);
  }
  .tag {
    position: absolute;
    top: 3px;
    right: 3px;
    padding: 1px 4px;
    border-radius: var(--gl-radius-small);
    background: var(--gl-photo-badge);
    color: var(--gl-on-photo);
    font-size: var(--gl-size-caption);
    font-weight: var(--gl-weight-semibold);
    letter-spacing: var(--gl-tracking-eyebrow);
    text-transform: uppercase;
  }
</style>
