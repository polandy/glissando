<script lang="ts" generics="Choice extends string">
  /** A wrapping row of toggle chips, one pressed; it only reports the pick. */
  let {
    choices,
    selected,
    label,
    ariaLabel,
    ariaLabelledby,
    onChange,
  }: {
    choices: readonly Choice[];
    selected: Choice;
    label: (choice: Choice) => string;
    ariaLabel?: string;
    ariaLabelledby?: string;
    onChange: (choice: Choice) => void;
  } = $props();
</script>

<div class="chiprow" role="group" aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
  {#each choices as choice (choice)}
    <button
      class="chip"
      class:checked={choice === selected}
      type="button"
      aria-pressed={choice === selected}
      onclick={() => onChange(choice)}
    >
      {label(choice)}
    </button>
  {/each}
</div>

<style>
  .chiprow {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 4px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .chip {
    padding: 7px 10px;
    border: 0;
    border-radius: var(--gl-radius-small);
    background: transparent;
    color: inherit;
    font-size: var(--gl-size-small);
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
  }
  .chip.checked {
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    font-weight: 600;
  }
  .chip:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }

  @media (pointer: coarse) {
    .chip {
      min-height: var(--gl-hit-min);
    }
  }
</style>
