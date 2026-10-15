<script lang="ts">
  /** An on/off switch; `label` is its accessible name. */
  let {
    checked,
    label,
    onChange,
  }: { checked: boolean; label: string; onChange: (checked: boolean) => void } = $props();
</script>

<label class="switch">
  <input
    type="checkbox"
    role="switch"
    aria-label={label}
    {checked}
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
