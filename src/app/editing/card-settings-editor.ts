import { defaultClosingCard, defaultOpeningCard, type CardInput } from "../../library/stored-card";
import {
  setClosingCard as setClosingCardEdit,
  setOpeningCard as setOpeningCardEdit,
} from "../../library/slideshow-edits-cards";
import { normalizeCaption } from "../../player/caption";
import type { StoredCard, StoredSlideshow } from "../../library/stored-slideshow";

/** `card` with its title and subtitle normalized by the caption rule. */
function normalizedCard(card: CardInput): CardInput {
  const title = normalizeCaption(typeof card.title === "string" ? card.title : "") ?? "";
  const subtitle =
    typeof card.subtitle === "string" ? normalizeCaption(card.subtitle) : card.subtitle;
  return { ...card, title, subtitle };
}

/** Whether two stored cards (or two absences) are the same, field for field. */
function cardsEqual(a: StoredCard | undefined, b: StoredCard | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** What `CardSettingsEditor` needs from the screen. */
export interface CardSettingsPorts {
  /** The BCP 47 language the title slide's default subtitle is worded in. */
  readonly locale: () => string;
}

/**
 * The slideshow's title slide and closing slide (ADR-0032, TITLE_SLIDES.md): opening an absent
 * card creates it with its defaults and stores it at once; every later field change stores too.
 * Removing drops it outright, no undo offered (unlike a picture's removal).
 */
export class CardSettingsEditor {
  readonly #ports: CardSettingsPorts;
  readonly #current: () => StoredSlideshow;
  readonly #apply: (slideshow: StoredSlideshow) => void;

  constructor(
    ports: CardSettingsPorts,
    current: () => StoredSlideshow,
    apply: (slideshow: StoredSlideshow) => void,
  ) {
    this.#ports = ports;
    this.#current = current;
    this.#apply = apply;
  }

  /** The title slide as it is now, creating and storing its defaults the first time. */
  ensureOpeningCard(): StoredCard {
    const slideshow = this.#current();
    const existing = slideshow.openingCard;
    if (existing !== undefined) {
      return existing;
    }
    const created = defaultOpeningCard(slideshow, this.#ports.locale());
    this.#apply(setOpeningCardEdit(slideshow, created));
    return created;
  }

  /** The closing slide as it is now, creating and storing its defaults the first time. */
  ensureClosingCard(): StoredCard {
    const slideshow = this.#current();
    const existing = slideshow.closingCard;
    if (existing !== undefined) {
      return existing;
    }
    const created = defaultClosingCard(slideshow);
    this.#apply(setClosingCardEdit(slideshow, created));
    return created;
  }

  setOpeningCard(card: CardInput): void {
    const slideshow = this.#current();
    const edited = setOpeningCardEdit(slideshow, normalizedCard(card));
    if (!cardsEqual(edited.openingCard, slideshow.openingCard)) {
      this.#apply(edited);
    }
  }

  removeOpeningCard(): void {
    this.#apply(setOpeningCardEdit(this.#current(), undefined));
  }

  setClosingCard(card: CardInput): void {
    const slideshow = this.#current();
    const edited = setClosingCardEdit(slideshow, normalizedCard(card));
    if (!cardsEqual(edited.closingCard, slideshow.closingCard)) {
      this.#apply(edited);
    }
  }

  removeClosingCard(): void {
    this.#apply(setClosingCardEdit(this.#current(), undefined));
  }
}
