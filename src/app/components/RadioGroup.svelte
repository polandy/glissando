<script lang="ts" module>
  import type { IconName } from "../../ui-kit/icons";

  export interface RadioOption<Value extends string> {
    readonly value: Value;
    readonly label: string;
    readonly hint?: string;
    readonly icon?: IconName;
  }
</script>

<script lang="ts" generics="Value extends string">
  import Icon from "./Icon.svelte";
  import { radioIndexForKey } from "./radio-keys";

  let {
    label,
    options,
    value,
    onSelect,
  }: {
    label: string;
    options: readonly RadioOption<Value>[];
    value: Value;
    onSelect: (value: Value) => void;
  } = $props();

  const radios: HTMLButtonElement[] = $state([]);
  // The hint describes an option; only the label names it.
  const idPrefix = $props.id();

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, options.length);
    const option = next === null ? undefined : options[next];
    if (next === null || option === undefined) {
      return;
    }
    event.preventDefault();
    onSelect(option.value);
    radios[next]?.focus();
  }
</script>

<div class="options" role="radiogroup" aria-label={label}>
  {#each options as option, index (option.value)}
    {@const checked = option.value === value}
    <button
      bind:this={radios[index]}
      class="option"
      type="button"
      role="radio"
      aria-checked={checked}
      aria-labelledby="{idPrefix}-{index}-label"
      aria-describedby={option.hint ? `${idPrefix}-${index}-hint` : undefined}
      tabindex={checked ? 0 : -1}
      onclick={() => onSelect(option.value)}
      onkeydown={(event) => onkeydown(event, index)}
    >
      {#if option.icon}<Icon name={option.icon} />{/if}
      <span class="text">
        <span class="label" id="{idPrefix}-{index}-label">{option.label}</span>
        {#if option.hint}<span class="hint" id="{idPrefix}-{index}-hint">{option.hint}</span>{/if}
      </span>
      {#if checked}<Icon name="check" />{/if}
    </button>
  {/each}
</div>

<style>
  .options {
    display: grid;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    overflow: hidden;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 14px;
    border: 0;
    background: var(--gl-surface);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
    text-align: left;
    cursor: pointer;
  }
  .option + .option {
    border-top: 1px solid var(--gl-line);
  }
  .option:hover {
    background: var(--gl-hover);
  }
  .option[aria-checked="true"] {
    background: color-mix(in srgb, var(--gl-accent) 12%, var(--gl-surface));
  }
  /* The group clips its corners, so the focus ring sits inside the option. */
  .option:focus-visible {
    outline-offset: -2px;
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
  }
  .label {
    font-weight: var(--gl-weight-semibold);
  }
  .hint {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
