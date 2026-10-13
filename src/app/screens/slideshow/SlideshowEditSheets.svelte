<script lang="ts">
  import { flushSync } from "svelte";
  import type { PortraitPictures } from "../../../library/portrait-pictures";
  import type { SlideshowTransition } from "../../../library/own-timing";
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import type { SlideshowDetails } from "../view-models";
  import PortraitPicturesSheet from "./PortraitPicturesSheet.svelte";
  import TransitionsSheet from "./TransitionsSheet.svelte";

  /**
   * The slideshow screen's two setting sheets (default transition, portrait pictures): each
   * opens over the screen and, once closed, hands focus back to the row it was opened from.
   */
  let {
    slideshow,
    previewPorts,
    reducedMotion,
    onTransition,
    onResetTransition,
    onPortraitPictures,
    onResetPortraitPictures,
    onTransitionsClosed,
    onPortraitPicturesClosed,
  }: {
    slideshow: SlideshowDetails;
    /** The transitions sheet's tiles loop on these. */
    previewPorts: MotionPreviewPorts;
    /** The transitions sheet's tiles stand still. */
    reducedMotion: boolean;
    onTransition: (transition: SlideshowTransition) => void;
    onResetTransition: () => void;
    onPortraitPictures: (choice: PortraitPictures) => void;
    onResetPortraitPictures: () => void;
    onTransitionsClosed: () => void;
    onPortraitPicturesClosed: () => void;
  } = $props();

  let editingTransitions = $state(false);
  let editingPortraitPictures = $state(false);

  export function openTransitions(): void {
    editingTransitions = true;
  }

  export function openPortraitPictures(): void {
    editingPortraitPictures = true;
  }

  function closeTransitions(): void {
    editingTransitions = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onTransitionsClosed();
  }

  function closePortraitPictures(): void {
    editingPortraitPictures = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onPortraitPicturesClosed();
  }
</script>

{#if editingTransitions}
  <TransitionsSheet
    {slideshow}
    ports={previewPorts}
    {reducedMotion}
    {onTransition}
    onReset={onResetTransition}
    onClose={closeTransitions}
  />
{/if}

{#if editingPortraitPictures}
  <PortraitPicturesSheet
    {slideshow}
    {onPortraitPictures}
    onReset={onResetPortraitPictures}
    onClose={closePortraitPictures}
  />
{/if}
