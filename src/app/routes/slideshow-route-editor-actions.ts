import type { SlideshowEditor } from "../editing/slideshow-editor";
import type { SlideshowEditCommands } from "../screens/slideshow/slideshow-edit-commands";
import { must } from "./must";

/**
 * Builds the slideshow-level edits `SlideshowScreen`'s setting sheets store, against whichever
 * editor `current` returns at the time one is called, so they keep working once the editor loads
 * in behind them.
 */
export function slideshowRouteEditorActions(
  current: () => SlideshowEditor | null,
): SlideshowEditCommands {
  return {
    onTransition: (transition) => current()?.setSlideshowTransition(transition),
    onResetTransition: () => current()?.resetSlideshowTransition(),
    onLook: (look) => current()?.look.set(look),
    onResetLook: () => current()?.look.reset(),
    onMood: (mood) => current()?.mood.set(mood),
    onResetMood: () => current()?.mood.reset(),
    onEnergyPacing: (on) => current()?.setEnergyPacing(on),
    onPortraitPictures: (choice) => current()?.setPortraitPictures(choice),
    onResetPortraitPictures: () => current()?.resetPortraitPictures(),
    onEnsureOpeningCard: () => must(current(), "the editor").ensureOpeningCard(),
    onOpeningCard: (card) => current()?.setOpeningCard(card),
    onRemoveOpeningCard: () => current()?.removeOpeningCard(),
    onEnsureClosingCard: () => must(current(), "the editor").ensureClosingCard(),
    onClosingCard: (card) => current()?.setClosingCard(card),
    onRemoveClosingCard: () => current()?.removeClosingCard(),
  };
}
