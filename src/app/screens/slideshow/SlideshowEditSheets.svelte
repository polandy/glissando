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
  import type { SongBeats } from "../../../compose/playlist";
  import type { MoodPreviewPorts } from "./mood-preview-ports";
  import CardSheet from "./card-sheet/CardSheet.svelte";
  import LookSheet from "./LookSheet.svelte";
  import ChapterSheet from "./chapter-sheet/ChapterSheet.svelte";
  import MoodSheet from "./MoodSheet.svelte";
  import PortraitPicturesSheet from "./PortraitPicturesSheet.svelte";
  import TransitionsSheet from "./TransitionsSheet.svelte";

  /**
   * The slideshow screen's setting sheets (default transition, look, mood, portrait pictures,
   * title slide, closing slide, chapter): one at a time opens over the screen and, once closed,
   * hands focus back to the row or tile it was opened from.
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
    moodBeats,
    onMood,
    onResetMood,
    onEnergyPacing,
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
    onChapterClosed,
    chapterEditor,
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
    /** The pass-aware beats the Mood sheet's live preview composes and paces to (MOOD.md). */
    moodBeats: SongBeats;
    /** A mood tile was tapped: stores at once. */
    onMood: (mood: SlideshowMood | undefined) => void;
    /** "Back to Custom" in the Mood sheet. */
    onResetMood: () => void;
    /** The Mood sheet's "Follow the music's energy" switch (ADR-0046): stores at once. */
    onEnergyPacing: (on: boolean) => void;
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
    onChapterClosed: (anchorPictureId: string) => void;
    /** The trip chapters editor (TRIP_CHAPTERS.md); null while importing. */
    chapterEditor: ChapterSettingsEditor | null;
  } = $props();

  // At most one sheet is open; the chapter sheet carries its chapter's anchor picture.
  type OpenSheet =
    | { kind: "transitions" | "look" | "mood" | "portraitPictures" | "openingCard" | "closingCard" }
    | { kind: "chapter"; anchorPictureId: string };

  let openSheet = $state<OpenSheet | null>(null);

  export function openTransitions(): void {
    openSheet = { kind: "transitions" };
  }

  export function openLook(): void {
    openSheet = { kind: "look" };
  }

  export function openMood(): void {
    openSheet = { kind: "mood" };
  }

  export function openPortraitPictures(): void {
    openSheet = { kind: "portraitPictures" };
  }

  export function openOpeningCard(): void {
    openSheet = { kind: "openingCard" };
  }

  export function openClosingCard(): void {
    openSheet = { kind: "closingCard" };
  }

  export function openChapter(anchorPictureId: string): void {
    openSheet = { kind: "chapter", anchorPictureId };
  }

  /** Inserts an added chapter before the picture (TRIP_CHAPTERS.md), then opens its sheet. */
  export function insertAndOpenChapter(pictureId: string): void {
    chapterEditor?.insertChapter(pictureId);
    openChapter(pictureId);
  }

  /** Hands focus back to the row or tile the closed sheet was opened from. */
  function focusOpener(closed: OpenSheet): void {
    switch (closed.kind) {
      case "transitions":
        return onTransitionsClosed();
      case "look":
        return onLookClosed();
      case "mood":
        return onMoodClosed();
      case "portraitPictures":
        return onPortraitPicturesClosed();
      case "openingCard":
        return onOpeningCardClosed();
      case "closingCard":
        return onClosingCardClosed();
      case "chapter":
        return onChapterClosed(closed.anchorPictureId);
    }
  }

  function close(): void {
    const closed = openSheet;
    if (closed === null) {
      return;
    }
    openSheet = null;
    // The modal dialog must be gone first: until then the page behind it is inert.
    flushSync();
    focusOpener(closed);
  }
</script>

{#if openSheet?.kind === "transitions"}
  <TransitionsSheet
    {slideshow}
    ports={previewPorts}
    {reducedMotion}
    {onTransition}
    onReset={onResetTransition}
    onClose={close}
  />
{:else if openSheet?.kind === "look"}
  <LookSheet {slideshow} {onLook} onReset={onResetLook} onClose={close} />
{:else if openSheet?.kind === "mood"}
  <MoodSheet
    {slideshow}
    previewPorts={moodPreviewPorts}
    {moodBpm}
    {moodBeats}
    {onMood}
    {onResetMood}
    {onEnergyPacing}
    onClose={close}
  />
{:else if openSheet?.kind === "portraitPictures"}
  <PortraitPicturesSheet
    {slideshow}
    {onPortraitPictures}
    onReset={onResetPortraitPictures}
    onClose={close}
  />
{:else if openSheet?.kind === "openingCard"}
  <CardSheet
    kind="opening"
    card={slideshow.openingCard}
    ensureCard={onEnsureOpeningCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={onOpeningCard}
    onRemove={onRemoveOpeningCard}
    onClose={close}
  />
{:else if openSheet?.kind === "closingCard"}
  <CardSheet
    kind="closing"
    card={slideshow.closingCard}
    ensureCard={onEnsureClosingCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={onClosingCard}
    onRemove={onRemoveClosingCard}
    onClose={close}
  />
{:else if openSheet?.kind === "chapter"}
  <ChapterSheet
    {slideshow}
    {chapterEditor}
    anchorPictureId={openSheet.anchorPictureId}
    onClose={close}
  />
{/if}
