<script lang="ts" generics="Value extends string">
  import { radioIndexForKey } from "./radio-keys";

  /**
   * A row of tabs (WAI-ARIA tabs: one tab stop, arrows move and select). The panel for each tab
   * is the caller's; `idPrefix` ties a tab to its panel by id, as `aria-controls`/`aria-labelledby`
   * need.
   */
  let {
    idPrefix,
    label,
    tabs,
    selected,
    onSelect,
  }: {
    idPrefix: string;
    label: string;
    tabs: readonly { value: Value; label: string }[];
    selected: Value;
    onSelect: (value: Value) => void;
  } = $props();

  const buttons: HTMLButtonElement[] = $state([]);

  function onkeydown(event: KeyboardEvent, index: number): void {
    const next = radioIndexForKey(event.key, index, tabs.length);
    const tab = next === null ? undefined : tabs[next];
    if (next === null || tab === undefined) return;
    event.preventDefault();
    onSelect(tab.value);
    buttons[next]?.focus();
  }
</script>

<div class="tabs" role="tablist" aria-label={label}>
  {#each tabs as tab, index (tab.value)}
    <button
      bind:this={buttons[index]}
      class="tab"
      class:selected={tab.value === selected}
      type="button"
      role="tab"
      id="{idPrefix}-tab-{tab.value}"
      aria-controls="{idPrefix}-panel-{tab.value}"
      aria-selected={tab.value === selected}
      tabindex={tab.value === selected ? 0 : -1}
      onclick={() => onSelect(tab.value)}
      onkeydown={(event) => onkeydown(event, index)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
  }
  .tab {
    flex: 1;
    padding: 8px 12px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: transparent;
    color: var(--gl-muted);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .tab.selected {
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
  }
</style>
