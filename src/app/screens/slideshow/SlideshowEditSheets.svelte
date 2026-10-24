<script lang="ts">
  import { flushSync } from "svelte";
  import type { StoredCard } from "../../../library/stored-slideshow";
  import type { CardInput } from "../../../library/stored-card";
  import type { PortraitPictures } from "../../../library/portrait-pictures";
  import type { SlideshowTransition } from "../../../library/own-timing";
  import type { SlideshowLook } from "../../../player";
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import type { ChapterSettingsEditor } from "../../editing/chapter-settings-editor";
  import type { SlideshowDetails } from "../view-models";
  import type { SlideshowMood } from "../../../library/slideshow-mood";
  import type { MoodPreviewPorts } from "./mood-preview-ports";
  import CardSheet from "./card-sheet/CardSheet.svelte";
  import LookSheet from "./LookSheet.svelte";
  import ChapterSheet from "./chapter-sheet/ChapterSheet.svelte";
  import MoodSheet from "./MoodSheet.svelte";
  import PortraitPicturesSheet from "./PortraitPicturesSheet.svelte";
  import TransitionsSheet from "./TransitionsSheet.svelte";

  /**
   * The slideshow screen's setting sheets (default transition, colour grade, portrait pictures,
   * title slide, closing slide): each opens over the screen and, once closed, hands focus back to
   * the row or tile it was opened from.
   */
  let {
    slideshow,
    previewPorts,
    reducedMotion,
    onTransition,
    onResetTransition,
    onLook,
    onResetLook,
    moodPreviewPorts,
    moodBpm,
    moodPending,
    onMood,
    onResetMood,
    onPortraitPictures,
    onResetPortraitPictures,
    onTransitionsClosed,
    onLookClosed,
    onMoodClosed,
    onPortraitPicturesClosed,
    onEnsureOpeningCard,
    onOpeningCard,
    onRemoveOpeningCard,
    onOpeningCardClosed,
    onEnsureClosingCard,
    onClosingCard,
    onRemoveClosingCard,
    onClosingCardClosed,
    chapterEditor,
    onChaptersClosed,
  }: {
    slideshow: SlideshowDetails;
    /** The transitions sheet's tiles loop on these. */
    previewPorts: MotionPreviewPorts;
    /** The transitions sheet's tiles and the card preview stand still. */
    reducedMotion: boolean;
    onTransition: (transition: SlideshowTransition) => void;
    onResetTransition: () => void;
    onLook: (look: SlideshowLook) => void;
    onResetLook: () => void;
    /** The Mood sheet's live preview data ports; left out while it has no pictures. */
    moodPreviewPorts: MoodPreviewPorts;
    /** The slideshow's tempo under its mood (ADR-0045); undefined without one. */
    moodBpm: number | undefined;
    /** Whether `moodBpm` may still change once analysis catches up; never "no beat found" then. */
    moodPending: boolean;
    /** A mood tile was tapped: stores at once. */
    onMood: (mood: SlideshowMood | undefined) => void;
    /** "Back to Custom" in the Mood sheet. */
    onResetMood: () => void;
    onPortraitPictures: (choice: PortraitPictures) => void;
    onResetPortraitPictures: () => void;
    onTransitionsClosed: () => void;
    onLookClosed: () => void;
    onMoodClosed: () => void;
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
    /** The trip chapters editor (TRIP_CHAPTERS.md); null while importing. */
    chapterEditor: ChapterSettingsEditor | null;
    onChaptersClosed: () => void;
  } = $props();

  let editingTransitions = $state(false);
  let editingLook = $state(false);
  let editingMood = $state(false);
  let editingPortraitPictures = $state(false);
  let editingOpeningCard = $state(false);
  let editingClosingCard = $state(false);
  // null closes the sheet; a null anchorPictureId inside opens it in general mode.
  let editingChapter = $state<{ anchorPictureId: string | null } | null>(null);

  export function openTransitions(): void {
    editingTransitions = true;
  }

  export function openLook(): void {
    editingLook = true;
  }

  export function openMood(): void {
    editingMood = true;
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

  export function openChapter(anchorPictureId: string): void {
    editingChapter = { anchorPictureId };
  }

  export function openGeneralChapters(): void {
    editingChapter = { anchorPictureId: null };
  }

  /** Inserts an added chapter before the picture (TRIP_CHAPTERS.md), then opens its sheet. */
  export function insertAndOpenChapter(pictureId: string): void {
    chapterEditor?.insertChapter(pictureId);
    openChapter(pictureId);
  }

  function closeTransitions(): void {
    editingTransitions = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onTransitionsClosed();
  }

  function closeLook(): void {
    editingLook = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onLookClosed();
  }

  function closeMood(): void {
    editingMood = false;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onMoodClosed();
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

  function closeChapters(): void {
    editingChapter = null;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    onChaptersClosed();
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

{#if editingLook}
  <LookSheet {slideshow} {onLook} onReset={onResetLook} onClose={closeLook} />
{/if}

{#if editingMood}
  <MoodSheet
    {slideshow}
    previewPorts={moodPreviewPorts}
    {moodBpm}
    {moodPending}
    {onMood}
    {onResetMood}
    onClose={closeMood}
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

{#if editingChapter !== null}
  <ChapterSheet
    {slideshow}
    {chapterEditor}
    anchorPictureId={editingChapter.anchorPictureId}
    onClose={closeChapters}
  />
{/if}
