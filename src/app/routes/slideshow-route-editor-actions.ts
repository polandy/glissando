import type { SlideshowEditor } from "../editing/slideshow-editor";
import { must } from "./must";

/**
 * Builds the slideshow-level edits `SlideshowScreen` triggers directly on the editor, grouped so
 * `SlideshowRoute` passes them to it as one prop, against whichever editor `current` returns at the
 * time one is called, so they keep working once the editor loads in behind them.
 */
export function slideshowRouteEditorActions(current: () => SlideshowEditor | null) {
  return {
    onTransition: (transition: Parameters<SlideshowEditor["setSlideshowTransition"]>[0]) =>
      current()?.setSlideshowTransition(transition),
    onResetTransition: () => current()?.resetSlideshowTransition(),
    onLook: (look: Parameters<SlideshowEditor["look"]["set"]>[0]) => current()?.look.set(look),
    onResetLook: () => current()?.look.reset(),
    onMood: (mood: Parameters<SlideshowEditor["mood"]["set"]>[0]) => current()?.mood.set(mood),
    onResetMood: () => current()?.mood.reset(),
    onEnergyPacing: (on: boolean) => current()?.setEnergyPacing(on),
    onPortraitPictures: (choice: Parameters<SlideshowEditor["setPortraitPictures"]>[0]) =>
      current()?.setPortraitPictures(choice),
    onResetPortraitPictures: () => current()?.resetPortraitPictures(),
    onEnsureOpeningCard: () => must(current(), "the editor").ensureOpeningCard(),
    onOpeningCard: (card: Parameters<SlideshowEditor["setOpeningCard"]>[0]) =>
      current()?.setOpeningCard(card),
    onRemoveOpeningCard: () => current()?.removeOpeningCard(),
    onEnsureClosingCard: () => must(current(), "the editor").ensureClosingCard(),
    onClosingCard: (card: Parameters<SlideshowEditor["setClosingCard"]>[0]) =>
      current()?.setClosingCard(card),
    onRemoveClosingCard: () => current()?.removeClosingCard(),
  };
}
