<script lang="ts">
  import type { Snippet } from "svelte";
  import type { IconName } from "../../ui-kit/icons";
  import SectionHead from "../components/SectionHead.svelte";
  import InfoButton from "./InfoButton.svelte";

  /** A section's head with the ⓘ button after its title, which opens `children` (the mechanics). */
  let {
    id,
    title,
    stateText,
    own = false,
    icon,
    infoLabel,
    children,
  }: {
    id: string;
    title: string;
    stateText?: string;
    own?: boolean;
    icon?: IconName;
    /** The button's accessible name, e.g. "About picture length". */
    infoLabel: string;
    children: Snippet;
  } = $props();
</script>

<div class="head">
  <SectionHead {id} {title} {own} {...icon === undefined ? {} : { icon }} />
  <InfoButton label={infoLabel} {children} />
  {#if stateText !== undefined}<span class="state" class:own>{stateText}</span>{/if}
</div>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  /* The state chip sits at the far end, like SectionHead's own. */
  .state {
    margin-left: auto;
    padding: 3px 9px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-pill);
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
  .state.own {
    border-color: transparent;
    background: color-mix(in srgb, var(--gl-accent) 28%, var(--gl-surface));
    color: var(--gl-ink);
  }
</style>
