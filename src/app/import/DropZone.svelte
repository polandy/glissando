<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../components/Icon.svelte";
  import type { IconName } from "../../ui-kit/icons";
  import { droppedFiles } from "./dropped-files";

  /**
   * Area that takes files dropped on it (desktop); the buttons inside open pickers. Dashed and
   * centred by default (the picture intake's call to action); `compact` draws a plain row instead
   * (SAMPLE_MUSIC.md, "Your own music"), its dashed accent outline shown only while something is
   * dragged over it.
   */
  let {
    icon,
    compact = false,
    onFiles,
    onError,
    children,
  }: {
    icon: IconName;
    compact?: boolean;
    onFiles: (files: File[]) => void;
    onError: (error: unknown) => void;
    children: Snippet;
  } = $props();

  let hover = $state(false);

  function over(event: DragEvent): void {
    event.preventDefault();
    hover = true;
  }

  function drop(event: DragEvent): void {
    event.preventDefault();
    hover = false;
    if (event.dataTransfer !== null) {
      droppedFiles(event.dataTransfer).then(onFiles, onError);
    }
  }
</script>

<div
  class="drop"
  class:compact
  class:hover
  role="group"
  ondragover={over}
  ondragleave={() => (hover = false)}
  ondrop={drop}
>
  <span class="icon"><Icon name={icon} /></span>
  {@render children()}
</div>

<style>
  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 16px;
    border: 1.5px dashed var(--gl-line);
    border-radius: var(--gl-radius-large);
    color: var(--gl-muted);
    text-align: center;
  }
  .drop.hover {
    border-color: var(--gl-mint);
    background: var(--gl-hover);
  }
  .icon {
    --gl-icon-size: var(--gl-size-display);
    color: var(--gl-faint);
    flex: none;
  }
  .drop.compact {
    flex-direction: row;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: inherit;
    text-align: left;
  }
  .drop.compact .icon {
    --gl-icon-size: var(--gl-size-icon);
    width: 40px;
    height: 40px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    display: grid;
    place-items: center;
    color: var(--gl-muted);
  }
  .drop.compact.hover {
    border-style: dashed;
    border-color: var(--gl-accent);
    background: var(--gl-surface);
  }
</style>
