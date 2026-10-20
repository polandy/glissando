<script lang="ts">
  import { MUSIC_FILE_PICKER_ACCEPT } from "../../import/music-format";
  import Icon from "../components/Icon.svelte";

  /** Opens the file picker and reports what was picked, raw, for the playlist to take or refuse. */
  let {
    primary = false,
    label,
    onAdd,
  }: {
    /** The empty playlist's own call to action; otherwise the understated "add another" button. */
    primary?: boolean;
    label: string;
    onAdd: (files: readonly File[]) => void;
  } = $props();

  let input = $state<HTMLInputElement>();

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    onAdd([...(event.currentTarget.files ?? [])]);
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
  }
</script>

<input
  bind:this={input}
  type="file"
  accept={MUSIC_FILE_PICKER_ACCEPT}
  multiple
  hidden
  onchange={picked}
/>
<button class={primary ? "primary" : "add"} type="button" onclick={() => input?.click()}>
  <Icon name="plus" />{label}
</button>

<style>
  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border: 1px dashed var(--gl-line);
    border-radius: var(--gl-radius);
    background: transparent;
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
    cursor: pointer;
  }
  .add:hover {
    background: var(--gl-hover);
  }
  .primary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-accent);
    color: var(--gl-accent-ink);
    font: inherit;
    font-size: var(--gl-size-body);
    font-weight: var(--gl-weight-semibold);
    cursor: pointer;
  }
  .primary:hover {
    background: var(--gl-accent-hover);
  }
</style>
