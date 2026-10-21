<script lang="ts">
  import type { PicturesFocus } from "../../focus/pictures-focus";
  import type { SlideshowSearch } from "../../../library/focus-pass";
  import FocusSheet from "./FocusSheet.svelte";

  /** Opens and closes the Focus sheet; `show()` is called from the More menu's "Focus …" entry. */
  let {
    focus,
    pictures,
    search,
    passPaused,
    onServer,
    onEdit,
    onLookAgain,
  }: {
    focus: PicturesFocus;
    pictures: readonly {
      readonly id: string;
      readonly thumbnailUrl: string;
      readonly ownMotion: boolean;
    }[];
    search: SlideshowSearch | undefined;
    passPaused: boolean;
    onServer: boolean;
    onEdit: (pictureId: string) => void;
    onLookAgain: (pictureIds: readonly string[]) => void;
  } = $props();

  let open = $state(false);

  export function show(): void {
    open = true;
  }
</script>

{#if open}
  <FocusSheet
    {focus}
    {pictures}
    {search}
    {passPaused}
    {onServer}
    onEdit={(pictureId) => {
      open = false;
      onEdit(pictureId);
    }}
    {onLookAgain}
    onClose={() => (open = false)}
  />
{/if}
