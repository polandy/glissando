import { getContext, setContext } from "svelte";
import type { CardInput } from "../../../library/stored-card";
import type { StoredCard } from "../../../library/stored-slideshow";
import type { PortraitPictures } from "../../../library/portrait-pictures";
import type { SlideshowTransition } from "../../../library/own-timing";
import type { SlideshowMood } from "../../../library/slideshow-mood";
import type { SlideshowLook } from "../../../player";

const SLIDESHOW_EDIT_COMMANDS_CONTEXT = Symbol("slideshow edit commands");

/** The slideshow-level edits the slideshow screen's setting sheets store. */
export interface SlideshowEditCommands {
  /** The slideshow's default transition was picked in its sheet. */
  readonly onTransition: (transition: SlideshowTransition) => void;
  /** "Back to crossfade" in the transitions sheet. */
  readonly onResetTransition: () => void;
  /** The slideshow's colour grade was picked in its sheet (ADR-0044). */
  readonly onLook: (look: SlideshowLook) => void;
  /** "Back to None" in the look sheet. */
  readonly onResetLook: () => void;
  /** A mood tile was tapped: stores at once. */
  readonly onMood: (mood: SlideshowMood | undefined) => void;
  /** "Back to Custom" in the Mood sheet. */
  readonly onResetMood: () => void;
  /** The Mood sheet's "Follow the music's energy" switch (ADR-0046): stores at once. */
  readonly onEnergyPacing: (on: boolean) => void;
  /** A choice was picked in the portrait pictures sheet. */
  readonly onPortraitPictures: (choice: PortraitPictures) => void;
  /** "Back to automatic" in the portrait pictures sheet. */
  readonly onResetPortraitPictures: () => void;
  /** Creates the title slide with its defaults, storing it at once. */
  readonly onEnsureOpeningCard: () => StoredCard;
  readonly onOpeningCard: (card: CardInput) => void;
  readonly onRemoveOpeningCard: () => void;
  /** Creates the closing slide with its defaults, storing it at once. */
  readonly onEnsureClosingCard: () => StoredCard;
  readonly onClosingCard: (card: CardInput) => void;
  readonly onRemoveClosingCard: () => void;
}

/** Hands `commands` to the slideshow screen's sheets. Call during component initialisation. */
export function provideSlideshowEditCommands(commands: SlideshowEditCommands): void {
  setContext(SLIDESHOW_EDIT_COMMANDS_CONTEXT, commands);
}

/** The edit commands the slideshow screen provides. Call during component initialisation. */
export function getSlideshowEditCommands(): SlideshowEditCommands {
  const commands = getContext<SlideshowEditCommands | undefined>(SLIDESHOW_EDIT_COMMANDS_CONTEXT);
  if (commands === undefined) {
    throw new Error(
      "no slideshow edit commands in context: render the sheets inside SlideshowScreen",
    );
  }
  return commands;
}

/** The context for `mount(…, { context })` of a sheet host mounted without the screen. */
export function slideshowEditCommandsContext(
  commands: SlideshowEditCommands,
): Map<symbol, unknown> {
  return new Map([[SLIDESHOW_EDIT_COMMANDS_CONTEXT, commands]]);
}
