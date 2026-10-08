<script lang="ts">
  import type { Snippet } from "svelte";
  import { droppedFiles } from "./dropped-files";

  /** Dashed area that takes files dropped on it (desktop); the buttons inside open pickers. */
  let {
    icon,
    onFiles,
    onError,
    children,
  }: {
    icon: string;
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
  class:hover
  role="group"
  ondragover={over}
  ondragleave={() => (hover = false)}
  ondrop={drop}
>
  <span class="icon" aria-hidden="true">{icon}</span>
  {@render children()}
</div>

<style>
  .drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 28px 16px;
    border: 3px dashed var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    text-align: center;
  }
  .drop.hover {
    border-color: var(--gl-mint);
    background: color-mix(in srgb, var(--gl-mint) 15%, var(--gl-surface));
  }
  .icon {
    font-size: var(--gl-size-display);
    line-height: 1;
  }
</style>
