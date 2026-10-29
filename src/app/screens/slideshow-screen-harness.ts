/** Shared set-up of the `SlideshowScreen` browser tests. */
import { NO_SONG_BEATS, type SongBeats } from "../../compose/playlist";
import type { SlideshowTransition } from "../../library/own-timing";
import type { SlideshowLook } from "../../player";
import type { SlideshowMood } from "../../library/slideshow-mood";
import type { ResolvedPortraitPictures } from "../../library/portrait-pictures";
import type { StoredCard } from "../../library/stored-slideshow";
import type { CardInput } from "../../library/stored-card";
import { FakeClock, FakeFrameScheduler } from "../../player/testing/fakes";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import { mountWithTranslator } from "../testing/mount-with-translator";
import { reactiveProps } from "../testing/reactive-props.svelte";
import SlideshowScreen from "./SlideshowScreen.svelte";
import type { ExportMenuState } from "../glissando-file/export-menu";
import type { SlideshowDetails, SlideshowStorage, StorageAction } from "./view-models";
import { createTranslator } from "../i18n/translator";
import type { ServerSlideshowRows } from "../server-library/server-slideshow-sessions";
import { NO_FOCUS_KNOWN, type PicturesFocus } from "../focus/pictures-focus";
import type { SlideshowSearch } from "../../library/focus-pass";
import type { ChapterSettingsEditor } from "../editing/chapter-settings-editor";
import type { MoodEnergyPacing } from "./slideshow/mood-energy-pacing";
import { createStorageFineSettingsFoldStore } from "./slideshow/fine-settings-fold";
import { moodPreviewPortsFixture } from "./slideshow/mood-preview-ports-fixture";
import { createMemoryStorage } from "../testing/memory-storage";
import { withClosingCard, withMood, withOpeningCard } from "./slideshow-screen-harness-cards";

/** The title slide a bare `ensureOpeningCard` call creates, for tests that don't care about it. */
const DEFAULT_OPENING_CARD: StoredCard = {
  title: "Sommer am See",
  subtitle: "1.–3. Juli 2025",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
  motion: true,
};

/** The closing slide a bare `ensureClosingCard` call creates, for tests that don't care about it. */
const DEFAULT_CLOSING_CARD: StoredCard = {
  title: "",
  style: "modern",
  position: "centre",
  entrance: "rise",
  background: { kind: "picture", pictureId: "a", fade: 60, tint: "picture" },
  motion: true,
};

let destroy = () => {};

/** Unmounts the screen the last `mountScreen` mounted. */
export function unmountScreen(): void {
  destroy();
  destroy = () => {};
}

// A transparent pixel stands in for every thumbnail.
export const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export function details(ids: readonly string[], overrides: Partial<SlideshowDetails> = {}) {
  const base: SlideshowDetails = {
    title: "Sommer am See",
    coverUrl: PIXEL,
    durationSeconds: 60,
    songCount: 0,
    musicTitle: null,
    musicSeconds: null,
    ownOrder: false,
    automaticChaptersOff: false,
    chapters: [],
    ownMotionCount: 0,
    ownDurationCount: 0,
    ownTransitionCount: 0,
    transition: "crossfade",
    energyPacing: false,
    look: "none",
    portraitPictures: "automatic",
    pairCount: 0,
    capturedFrom: "2025-07-01T10:00:00Z",
    capturedTo: "2025-07-03T10:00:00Z",
    pictures: ids.map((id, index) => ({
      id,
      thumbnailUrl: PIXEL,
      capturedAt: `2025-07-0${index + 1}T10:00:00Z`,
      ownMotion: false,
      ownDurationMs: null,
      ownTransition: null,
      pairedWithNumber: null,
      blurredFill: false,
      alone: false,
      colours: { veil: "#404040", accent: "#C0C0C0" },
    })),
  };
  return { ...base, ...overrides };
}

export function mountScreen(
  slideshow: SlideshowDetails = details(["a", "b", "c"]),
  {
    mousePointer = true,
    saving = false,
    reducedMotion = false,
    newPictureIds = new Set<string>(),
    storage = null as SlideshowStorage | null,
    serverRows = null as ServerSlideshowRows | null,
    focus = NO_FOCUS_KNOWN as PicturesFocus,
    focusSearch = undefined as SlideshowSearch | undefined,
    focusPaused = false,
    english = false,
    chapterEditor = null as ChapterSettingsEditor | null,
    moodBpm = undefined as number | undefined,
    moodBeats = NO_SONG_BEATS as SongBeats,
    moodEnergyPacing = null as MoodEnergyPacing | null,
    moodPreviewPorts = moodPreviewPortsFixture(),
    fineSettingsFold = createStorageFineSettingsFoldStore(createMemoryStorage()),
  } = {},
) {
  const clock = new FakeClock();
  const frames = new FakeFrameScheduler();
  const holdScheduler = new FakeScheduler();
  const dragFrames = new FakeFrameScheduler();
  const calls = {
    removed: [] as string[],
    shuffles: 0,
    removedGroup: [] as string[][],
    shifted: [] as [readonly string[], number][],
    moved: [] as [readonly string[], number][],
    renamed: [] as string[],
    edited: [] as string[],
    musicEdits: 0,
    transitions: [] as SlideshowTransition[],
    transitionResets: 0,
    looks: [] as SlideshowLook[],
    lookResets: 0,
    moods: [] as (SlideshowMood | undefined)[],
    moodResets: 0,
    energyPacingChoices: [] as boolean[],
    portraitPictureChoices: [] as ResolvedPortraitPictures[],
    portraitPictureResets: 0,
    deletes: 0,
    adds: 0,
    plays: 0,
    storageActions: [] as StorageAction[],
    openingCardsEnsured: 0,
    openingCards: [] as CardInput[],
    openingCardsRemoved: 0,
    closingCardsEnsured: 0,
    closingCards: [] as CardInput[],
    closingCardsRemoved: 0,
    loaded: [] as string[],
    errors: [] as unknown[],
    lookAgain: [] as string[][],
  };
  // The transitions sheet's picks and resets come back as the parent would show them.
  const props = reactiveProps({
    slideshow,
    onBack: () => {},
    onPlay: () => (calls.plays += 1),
    onAddPictures: () => (calls.adds += 1),
    newPictureIds,
    onRemove: (pictureId: string) => calls.removed.push(pictureId),
    onShuffle: () => (calls.shuffles += 1),
    onShiftGroup: (pictureIds: readonly string[], offset: number) =>
      calls.shifted.push([pictureIds, offset]),
    onRemoveGroup: (pictureIds: readonly string[]) => calls.removedGroup.push([...pictureIds]),
    onMoveGroup: (pictureIds: readonly string[], insertion: number) =>
      calls.moved.push([pictureIds, insertion]),
    holdScheduler,
    frameScheduler: dragFrames,
    onRename: (typed: string) => calls.renamed.push(typed),
    onEdit: (pictureId: string) => calls.edited.push(pictureId),
    loadPicture: (pictureId: string) => {
      calls.loaded.push(pictureId);
      return Promise.resolve(new Blob());
    },
    onError: (error: unknown) => calls.errors.push(error),
    onEditMusic: () => (calls.musicEdits += 1),
    onTransition: (transition: SlideshowTransition) => {
      calls.transitions.push(transition);
      props.slideshow = { ...props.slideshow, transition };
    },
    onResetTransition: () => {
      calls.transitionResets += 1;
      props.slideshow = { ...props.slideshow, transition: "crossfade" };
    },
    onLook: (look: SlideshowLook) => {
      calls.looks.push(look);
      props.slideshow = { ...props.slideshow, look };
    },
    onResetLook: () => {
      calls.lookResets += 1;
      props.slideshow = { ...props.slideshow, look: "none" };
    },
    moodBpm,
    moodBeats,
    moodEnergyPacing,
    moodPreviewPorts,
    onMood: (mood: SlideshowMood | undefined) => {
      calls.moods.push(mood);
      props.slideshow = withMood(props.slideshow, mood);
    },
    onResetMood: () => {
      calls.moodResets += 1;
      props.slideshow = withMood(props.slideshow, undefined);
    },
    onEnergyPacing: (on: boolean) => {
      calls.energyPacingChoices.push(on);
      props.slideshow = { ...props.slideshow, energyPacing: on };
    },
    onPortraitPictures: (choice: ResolvedPortraitPictures) => {
      calls.portraitPictureChoices.push(choice);
      props.slideshow = { ...props.slideshow, portraitPictures: choice };
    },
    onResetPortraitPictures: () => {
      calls.portraitPictureResets += 1;
      props.slideshow = { ...props.slideshow, portraitPictures: "automatic" };
    },
    onEnsureOpeningCard: () => {
      calls.openingCardsEnsured += 1;
      const created = props.slideshow.openingCard ?? DEFAULT_OPENING_CARD;
      props.slideshow = withOpeningCard(props.slideshow, created);
      return created;
    },
    onOpeningCard: (card: CardInput) => {
      calls.openingCards.push(card);
      props.slideshow = withOpeningCard(props.slideshow, card as StoredCard);
    },
    onRemoveOpeningCard: () => {
      calls.openingCardsRemoved += 1;
      props.slideshow = withOpeningCard(props.slideshow, undefined);
    },
    onEnsureClosingCard: () => {
      calls.closingCardsEnsured += 1;
      const created = props.slideshow.closingCard ?? DEFAULT_CLOSING_CARD;
      props.slideshow = withClosingCard(props.slideshow, created);
      return created;
    },
    onClosingCard: (card: CardInput) => {
      calls.closingCards.push(card);
      props.slideshow = withClosingCard(props.slideshow, card as StoredCard);
    },
    onRemoveClosingCard: () => {
      calls.closingCardsRemoved += 1;
      props.slideshow = withClosingCard(props.slideshow, undefined);
    },
    chapterEditor,
    previewPorts: { clock, frames },
    reducedMotion,
    onDelete: () => (calls.deletes += 1),
    exportState: { kind: "idle", sizeBytes: null } as ExportMenuState,
    onExport: () => Promise.resolve("saved" as const),
    onShareOpened: () => {},
    newVideoExport: () => {
      throw new Error("the video export sheet is not opened in these tests");
    },
    newHtmlExport: () => {
      throw new Error("the web page export sheet is not opened in these tests");
    },
    mousePointer,
    saving,
    storage,
    serverRows,
    onStorageAction: (action: StorageAction) => calls.storageActions.push(action),
    fineSettingsFold,
    focus,
    focusSearch,
    focusPaused,
    onLookAgain: (pictureIds: readonly string[]) => calls.lookAgain.push([...pictureIds]),
  });
  const mounted = mountWithTranslator(
    SlideshowScreen,
    props,
    english ? { current: createTranslator("en") } : undefined,
  );
  destroy = mounted.destroy;
  return { target: mounted.target, calls, clock, frames, holdScheduler, dragFrames };
}

export {
  byLabel,
  buttonNamed,
  tile,
  selectionBar,
  press,
  click,
  firePointer,
} from "./slideshow-screen-dom";
