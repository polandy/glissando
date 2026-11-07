<script lang="ts">
  import type { MotionPreviewPorts } from "../../picture-editor/motion-preview";
  import type { ChapterSettingsEditor } from "../../editing/chapter-settings-editor";
  import type { SlideshowDetails } from "../view-models";
  import type { SongBeats } from "../../../compose/playlist";
  import type { MoodPreviewPorts } from "./mood-preview-ports";
  import { getSlideshowEditCommands } from "./slideshow-edit-commands";
  import type { SlideshowSheets } from "./slideshow-sheets.svelte";
  import CardSheet from "./card-sheet/CardSheet.svelte";
  import LookSheet from "./LookSheet.svelte";
  import ChapterSheet from "./chapter-sheet/ChapterSheet.svelte";
  import MoodSheet from "./MoodSheet.svelte";
  import PortraitPicturesSheet from "./PortraitPicturesSheet.svelte";
  import TransitionsSheet from "./TransitionsSheet.svelte";

  /**
   * The slideshow screen's setting sheets (default transition, look, mood, portrait pictures,
   * title slide, closing slide, chapter): the one `sheets` names opens over the screen, and its
   * picks go to the edit commands the screen provides.
   */
  let {
    sheets,
    slideshow,
    previewPorts,
    reducedMotion,
    moodPreviewPorts,
    moodBpm,
    moodBeats,
    chapterEditor,
  }: {
    sheets: SlideshowSheets;
    slideshow: SlideshowDetails;
    /** The transitions sheet's tiles loop on these. */
    previewPorts: MotionPreviewPorts;
    /** The transitions sheet's tiles and the card preview stand still. */
    reducedMotion: boolean;
    /** The Mood sheet's live preview data ports; left out while it has no pictures. */
    moodPreviewPorts: MoodPreviewPorts;
    /** The slideshow's tempo under its mood (ADR-0045); undefined without one. */
    moodBpm: number | undefined;
    /** The pass-aware beats the Mood sheet's live preview composes and paces to (MOOD.md). */
    moodBeats: SongBeats;
    /** The trip chapters editor (TRIP_CHAPTERS.md); null while importing. */
    chapterEditor: ChapterSettingsEditor | null;
  } = $props();

  const commands = getSlideshowEditCommands();
  const open = $derived(sheets.current);
  const close = () => sheets.close();
</script>

{#if open?.kind === "transitions"}
  <TransitionsSheet
    {slideshow}
    ports={previewPorts}
    {reducedMotion}
    onTransition={commands.onTransition}
    onReset={commands.onResetTransition}
    onClose={close}
  />
{:else if open?.kind === "look"}
  <LookSheet {slideshow} onLook={commands.onLook} onReset={commands.onResetLook} onClose={close} />
{:else if open?.kind === "mood"}
  <MoodSheet
    {slideshow}
    previewPorts={moodPreviewPorts}
    {moodBpm}
    {moodBeats}
    onMood={commands.onMood}
    onResetMood={commands.onResetMood}
    onEnergyPacing={commands.onEnergyPacing}
    onClose={close}
  />
{:else if open?.kind === "portraitPictures"}
  <PortraitPicturesSheet
    {slideshow}
    onPortraitPictures={commands.onPortraitPictures}
    onReset={commands.onResetPortraitPictures}
    onClose={close}
  />
{:else if open?.kind === "openingCard"}
  <CardSheet
    kind="opening"
    card={slideshow.openingCard}
    ensureCard={commands.onEnsureOpeningCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={commands.onOpeningCard}
    onRemove={commands.onRemoveOpeningCard}
    onClose={close}
  />
{:else if open?.kind === "closingCard"}
  <CardSheet
    kind="closing"
    card={slideshow.closingCard}
    ensureCard={commands.onEnsureClosingCard}
    pictures={slideshow.pictures}
    {previewPorts}
    {reducedMotion}
    onChange={commands.onClosingCard}
    onRemove={commands.onRemoveClosingCard}
    onClose={close}
  />
{:else if open?.kind === "chapter"}
  <ChapterSheet
    {slideshow}
    {chapterEditor}
    anchorPictureId={open.anchorPictureId}
    onClose={close}
  />
{/if}
