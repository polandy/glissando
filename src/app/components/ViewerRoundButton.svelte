<script lang="ts">
  import type { Snippet } from "svelte";

  /** The round glass button the full-screen viewer uses for closing and stepping. */
  let {
    label,
    onclick,
    disabled = false,
    element = $bindable(),
    children,
  }: {
    label: string;
    onclick: () => void;
    disabled?: boolean;
    element?: HTMLButtonElement | undefined;
    children: Snippet;
  } = $props();
</script>

<button class="round" type="button" bind:this={element} aria-label={label} {disabled} {onclick}>
  {@render children()}
</button>

<style>
  .round {
    display: grid;
    place-items: center;
    flex: none;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-player-glass);
    color: inherit;
    cursor: pointer;
  }
  .round:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .round:focus-visible {
    outline: 2px solid var(--gl-player-outline);
    outline-offset: 2px;
  }
</style>
