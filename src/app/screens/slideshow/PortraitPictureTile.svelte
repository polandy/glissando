<script lang="ts">
  import {
    FILL_SCREEN_PORTRAIT_PICTURES,
    ONE_AT_A_TIME_PORTRAIT_PICTURES,
    type ResolvedPortraitPictures,
  } from "../../../library/portrait-pictures";
  import { getTranslator } from "../../i18n/context";

  /** One choice of the portrait pictures radiogroup: its hint and a tiny diagram of its layout. */
  let {
    choice,
    checked,
    automatic,
    radio = $bindable(),
    onPick,
    onKeydown,
  }: {
    choice: ResolvedPortraitPictures;
    checked: boolean;
    /** The checked tile is the slideshow's untouched setting: its outline is dashed. */
    automatic: boolean;
    radio?: HTMLButtonElement | undefined;
    onPick: () => void;
    onKeydown: (event: KeyboardEvent) => void;
  } = $props();

  const { t } = getTranslator();

  /** The hint key's suffix for `choice`, in the message catalogue's PascalCase naming. */
  const hintKey = $derived(
    choice === ONE_AT_A_TIME_PORTRAIT_PICTURES
      ? "portrait.hintOneAtATime"
      : choice === FILL_SCREEN_PORTRAIT_PICTURES
        ? "portrait.hintFillScreen"
        : "portrait.hintAutomatic",
  );
</script>

<button
  bind:this={radio}
  class="opt"
  class:automatic
  type="button"
  role="radio"
  aria-checked={checked}
  tabindex={checked ? 0 : -1}
  data-choice={choice}
  onclick={onPick}
  onkeydown={onKeydown}
>
  <span class="dot" aria-hidden="true"></span>
  <b>{t(`portrait.choice-${choice}`)}</b>
  <span class="diagram {choice}" aria-hidden="true">
    {#if choice === "automatic"}
      <i class="half left"></i><i class="half right"></i>
    {:else if choice === "one-at-a-time"}
      <i class="backdrop"></i><i class="whole"></i>
    {:else}
      <i class="covered"></i>
    {/if}
  </span>
  <small>{t(hintKey)}</small>
</button>

<style>
  .opt {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 2px 12px;
    align-items: center;
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .opt:hover {
    background: var(--gl-hover);
  }
  .opt:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .opt[aria-checked="true"] {
    border-color: var(--gl-accent);
    box-shadow: 0 0 0 1px var(--gl-accent) inset;
    background: color-mix(in srgb, var(--gl-accent) 10%, var(--gl-surface));
  }
  .dot {
    grid-row: span 2;
    width: 17px;
    height: 17px;
    border: 2px solid var(--gl-faint);
    border-radius: var(--gl-radius-pill);
  }
  .opt[aria-checked="true"] .dot {
    border-width: 5px;
    border-color: var(--gl-accent);
  }
  .automatic[aria-checked="true"] .dot {
    border-style: dashed;
  }
  b {
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  small {
    grid-column: 2;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    line-height: 1.35;
  }
  .diagram {
    position: relative;
    grid-row: span 2;
    width: 52px;
    height: 30px;
    overflow: hidden;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-small);
    background: var(--gl-ground);
  }
  .diagram i {
    position: absolute;
  }
  .diagram.automatic .half {
    top: 10%;
    bottom: 10%;
    width: 38%;
  }
  .diagram.automatic .left {
    left: 8%;
    background: var(--gl-accent);
  }
  .diagram.automatic .right {
    right: 8%;
    background: var(--gl-mint);
  }
  .diagram.one-at-a-time .backdrop {
    inset: 0;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--gl-muted) 25%, var(--gl-surface)),
      color-mix(in srgb, var(--gl-muted) 45%, var(--gl-surface))
    );
  }
  .diagram.one-at-a-time .whole {
    left: 30%;
    top: 6%;
    width: 40%;
    height: 88%;
    background: var(--gl-accent);
  }
  .diagram.fill-screen .covered {
    inset: -18% 0;
    background: var(--gl-accent);
  }
</style>
