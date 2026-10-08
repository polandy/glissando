<script lang="ts">
  import { GLISSANDO_FILE_EXTENSION } from "../../glissando-file/export-slideshow";

  /** The system file picker for one .glissando file; `pick()` opens it. */
  let { onFile }: { onFile: (file: File) => void } = $props();

  let input: HTMLInputElement;

  export function pick(): void {
    input.click();
  }

  function picked(event: Event & { currentTarget: HTMLInputElement }): void {
    const file = event.currentTarget.files?.[0];
    // Cleared so that picking the same file again still reports a change.
    event.currentTarget.value = "";
    if (file !== undefined) {
      onFile(file);
    }
  }
</script>

<input bind:this={input} type="file" accept={GLISSANDO_FILE_EXTENSION} hidden onchange={picked} />
