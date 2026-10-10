<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "../components/Icon.svelte";
  import type { IconName } from "../../ui-kit/icons";
  import { droppedFiles } from "./dropped-files";

  /** Dashed area that takes files dropped on it (desktop); the buttons inside open pickers. */
  let {
    icon,
    onFiles,
    onError,
    children,
  }: {
    icon: IconName;
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
  }
</style>
