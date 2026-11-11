<script lang="ts">
  import Icon from "../components/Icon.svelte";

  /** The search field above a list of names. */
  let { value = $bindable(), label }: { value: string; label: string } = $props();
</script>

<label class="filter">
  <Icon name="search" />
  <input
    class="field"
    type="search"
    autocomplete="off"
    placeholder={label}
    aria-label={label}
    bind:value
  />
</label>

<style>
  .filter {
    --gl-icon-size: var(--gl-size-icon-small);
    position: relative;
    display: block;
    width: 260px;
    max-width: 100%;
    color: var(--gl-faint);
  }
  .filter :global(.icon) {
    position: absolute;
    top: 11px;
    left: 11px;
  }
  .field {
    width: 100%;
    height: 38px;
    padding: 0 11px 0 34px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
  }
  .field:focus {
    border-color: var(--gl-accent);
  }
  @container (max-width: 720px) {
    .filter {
      width: 100%;
    }
  }
</style>
