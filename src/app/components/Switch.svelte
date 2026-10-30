<script lang="ts">
  /** An on/off switch; `label` is its accessible name, and with `showLabel` also its tap target. */
  let {
    checked,
    label,
    showLabel = false,
    disabled = false,
    onChange,
  }: {
    checked: boolean;
    label: string;
    showLabel?: boolean;
    disabled?: boolean;
    onChange: (checked: boolean) => void;
  } = $props();
</script>

<label class="switch" class:disabled class:labelled={showLabel}>
  {#if showLabel}<span aria-hidden="true">{label}</span>{/if}
  <input
    type="checkbox"
    role="switch"
    aria-label={label}
    {checked}
    {disabled}
    onchange={(event) => onChange(event.currentTarget.checked)}
  />
  <span class="track" aria-hidden="true"></span>
</label>

<style>
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .switch.labelled {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
  .switch.disabled {
    cursor: default;
    opacity: 0.5;
  }
  .track {
    position: relative;
    display: block;
    width: 38px;
    height: 22px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-line);
    transition: background-color 0.15s;
  }
  .track::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    transition: transform 0.15s;
  }
  .switch input:checked + .track {
    background: var(--gl-accent);
  }
  .switch input:checked + .track::after {
    transform: translateX(16px);
  }
  .switch input:focus-visible + .track {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
</style>
