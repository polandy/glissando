<script lang="ts" module>
  /** One size in an export sheet's radio group. */
  export interface SizeOption<Id extends string> {
    readonly id: Id;
    readonly name: string;
    /** Beside the name: "1920 × 1080", "1280 px". */
    readonly detail: string;
    /** At the end of the row: "ca. 16 MB"; empty while unknown. */
    readonly size: string;
    /** Under the name: what the size is for, or why it is unusable. */
    readonly use: string;
    readonly usable: boolean;
  }
</script>

<script lang="ts" generics="Id extends string">
  import { radioIndexForKey } from "../../../components/radio-keys";

  /** An export's sizes; one that cannot be made is greyed out and skipped by the arrows. */
  let {
    label,
    options,
    selected,
    onSelect,
  }: {
    label: string;
    options: readonly SizeOption<Id>[];
    selected: Id;
    onSelect: (id: Id) => void;
  } = $props();

  const radios: Partial<Record<Id, HTMLButtonElement>> = $state({});
  const usable = $derived(options.filter((option) => option.usable).map((option) => option.id));

  /** Focuses the chosen size, as the sheet opens. */
  export function focus(): void {
    radios[selected]?.focus();
  }

  // Selection follows focus, as in the WAI-ARIA radio group: one tab stop, arrows choose.
  function onkeydown(event: KeyboardEvent): void {
    const next = radioIndexForKey(event.key, usable.indexOf(selected), usable.length);
    const choice = next === null ? undefined : usable[next];
    if (choice === undefined) {
      return;
    }
    event.preventDefault();
    onSelect(choice);
    radios[choice]?.focus();
  }
</script>

<div class="presets" role="radiogroup" aria-label={label}>
  {#each options as option (option.id)}
    {@const checked = option.usable && option.id === selected}
    <button
      bind:this={radios[option.id]}
      class="preset"
      type="button"
      role="radio"
      aria-checked={checked}
      aria-disabled={!option.usable}
      tabindex={checked ? 0 : -1}
      onclick={() => option.usable && onSelect(option.id)}
      {onkeydown}
    >
      <span class="dot"></span>
      <b>{option.name} <span class="mono resolution">{option.detail}</span></b>
      <span class="size mono">{option.size}</span>
      <small>{option.use}</small>
    </button>
  {/each}
</div>

<style>
  .presets {
    display: grid;
    gap: 8px;
  }
  .preset {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 2px 12px;
    padding: 11px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    text-align: left;
    cursor: pointer;
  }
  .preset:hover {
    background: var(--gl-hover);
  }
  .preset[aria-checked="true"] {
    border-color: var(--gl-accent);
    box-shadow: inset 0 0 0 1px var(--gl-accent);
    background: color-mix(in srgb, var(--gl-accent) 10%, var(--gl-surface));
  }
  .preset[aria-disabled="true"] {
    background: transparent;
    color: var(--gl-faint);
    cursor: default;
  }
  .dot {
    grid-row: span 2;
    width: 18px;
    height: 18px;
    border: 2px solid var(--gl-faint);
    border-radius: 50%;
  }
  .preset[aria-checked="true"] .dot {
    border: 5px solid var(--gl-accent);
  }
  b {
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-body);
  }
  .resolution {
    color: var(--gl-muted);
    font-weight: var(--gl-weight-regular);
    font-size: var(--gl-size-meta);
  }
  small {
    grid-column: 2;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .size {
    grid-row: span 2;
    color: var(--gl-muted);
    text-align: right;
  }
  .preset[aria-disabled="true"] :is(small, .size, .resolution) {
    color: var(--gl-faint);
  }
</style>
