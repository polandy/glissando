<script lang="ts">
  import { flushSync } from "svelte";
  import type { StoredCard } from "../../../library/stored-slideshow";
  import type { CardInput } from "../../../library/stored-card";
  import type { PortraitPictures } from "../../../library/portrait-pictures";
  import type { SlideshowTransition } from "../../../library/own-timing";
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import type { SlideshowDetails } from "../view-models";
  import CardSheet from "./card-sheet/CardSheet.svelte";
  import PortraitPicturesSheet from "./PortraitPicturesSheet.svelte";
  import TransitionsSheet from "./TransitionsSheet.svelte";

  /**
   * The slideshow screen's setting sheets (default transition, portrait pictures, title slide,
   * closing slide): each opens over the screen and, once closed, hands focus back to the row or
   * tile it was opened from.
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
    onEnsureOpeningCard,
    onOpeningCard,
    onRemoveOpeningCard,
    onOpeningCardClosed,
    onEnsureClosingCard,
    onClosingCard,
    onRemoveClosingCard,
    onClosingCardClosed,
  }: {
    slideshow: SlideshowDetails;
    /** The transitions sheet's tiles loop on these. */
    previewPorts: MotionPreviewPorts;
    /** The transitions sheet's tiles and the card preview stand still. */
    reducedMotion: boolean;
    onTransition: (transition: SlideshowTransition) => void;
    onResetTransition: () => void;
    onPortraitPictures: (choice: PortraitPictures) => void;
    onResetPortraitPictures: () => void;
    onTransitionsClosed: () => void;
    onPortraitPicturesClosed: () => void;
    /** Creates the title slide with its defaults, storing it at once. */
    onEnsureOpeningCard: () => StoredCard;
    onOpeningCard: (card: CardInput) => void;
    onRemoveOpeningCard: () => void;
    onOpeningCardClosed: () => void;
    /** Creates the closing slide with its defaults, storing it at once. */
    onEnsureClosingCard: () => StoredCard;
    onClosingCard: (card: CardInput) => void;
    onRemoveClosingCard: () => void;
    onClosingCardClosed: () => void;
  } = $props();

  let editingTransitions = $state(false);
  let editingPortraitPictures = $state(false);
  let editingOpeningCard = $state(false);
  let editingClosingCard = $state(false);

  export function openTransitions(): void {
    editingTransitions = true;
  }

  export function openPortraitPictures(): void {
    editingPortraitPictures = true;
  }

  export function openOpeningCard(): void {
    editingOpeningCard = true;
  }

  export function openClosingCard(): void {
    editingClosingCard = true;
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

  function closeOpeningCard(): void {
    editingOpeningCard = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onOpeningCardClosed();
  }

  function closeClosingCard(): void {
    editingClosingCard = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onClosingCardClosed();
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

{#if editingOpeningCard}
  <CardSheet
    kind="opening"
    card={slideshow.openingCard}
    ensureCard={onEnsureOpeningCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={onOpeningCard}
    onRemove={onRemoveOpeningCard}
    onClose={closeOpeningCard}
  />
{/if}

{#if editingClosingCard}
  <CardSheet
    kind="closing"
    card={slideshow.closingCard}
    ensureCard={onEnsureClosingCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={onClosingCard}
    onRemove={onRemoveClosingCard}
    onClose={closeClosingCard}
  />
{/if}
