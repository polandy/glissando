import type { Scheduler } from "../ui-kit/scheduler";
import type { CommandNote } from "../tv-remote/tv-controller";
import { qrSvg } from "./qr-svg";
import { fill } from "./share-page-words";
import type { TvPageWords } from "./tv-page-words";

/** How long a command's note stays on screen. */
export const NOTE_SHOWN_MS = 1800;

/** The TV's own cards (dev-docs/tv_remote/TV_PAGE.md); at most one shows at a time. */
export type TvCard =
  | { readonly kind: "pairing"; readonly code: string; readonly link: string }
  | { readonly kind: "connected" }
  | { readonly kind: "ended"; readonly title: string }
  | { readonly kind: "unreachable" };

/** What the TV page adds to the share page. */
export interface TvParts {
  /** On the pairing card: unlocks the music; focused, so OK on a TV remote presses it. */
  readonly allowSound: HTMLButtonElement;
  showCard(card: TvCard | null): void;
  /** The sound is allowed: the button says so. */
  showSoundAllowed(): void;
  /** `note` for `NOTE_SHOWN_MS`, in place of the one before. */
  showNote(note: CommandNote): void;
  /** The corner chip with the remote's QR code of `link`; null hides it. */
  showChip(link: string | null): void;
}

export function createTvParts(
  document: Document,
  words: TvPageWords,
  scheduler: Scheduler,
): TvParts {
  const make = <Tag extends keyof HTMLElementTagNameMap>(
    tag: Tag,
    className: string,
    ...children: (Node | string)[]
  ): HTMLElementTagNameMap[Tag] => {
    const node = document.createElement(tag);
    node.className = className;
    node.append(...children);
    return node;
  };
  const qr = (link: string) => make("div", "qr-frame", qrSvg(document, link, words.tvQrCode));

  const allowSound = make("button", "again allow-sound", words.tvAllowSound);
  allowSound.type = "button";
  const card = make("div", "card tv-card");
  const note = make("div", "tv-note");
  note.setAttribute("role", "status");
  const chip = make("div", "tv-chip");
  document.body.append(card, note, chip);

  const body = (title: string, text: string, ...more: Node[]) =>
    make(
      "div",
      "tv-text",
      make("div", "wordmark", words.appName),
      make("h2", "title", title),
      make("p", "", text),
      ...more,
    );
  const content = (shown: TvCard): Node[] => {
    switch (shown.kind) {
      case "pairing":
        return [
          body(words.tvPairTitle, words.tvPairText, make("div", "tv-code", shown.code), allowSound),
          qr(shown.link),
        ];
      case "connected":
        return [body(words.tvConnectedTitle, words.tvConnectedText)];
      case "ended":
        return [body(fill(words.tvEndedTitle, { title: shown.title }), words.tvEndedText)];
      case "unreachable":
        return [body(words.tvUnreachableTitle, words.tvUnreachableText)];
    }
  };
  const noteText = (shown: CommandNote): string => {
    switch (shown.kind) {
      case "playing":
        return words.tvNotePlaying;
      case "paused":
        return words.tvNotePaused;
      case "next":
        return words.tvNoteNext;
      case "previous":
        return words.tvNotePrevious;
      case "volume":
        return fill(words.tvNoteVolume, { percent: String(shown.percent) });
    }
  };

  let hideNote: (() => void) | null = null;
  const showCard = (shown: TvCard | null) => {
    card.hidden = shown === null;
    card.dataset["card"] = shown?.kind ?? "";
    card.replaceChildren(...(shown === null ? [] : content(shown)));
    if (shown?.kind === "pairing" && !allowSound.disabled) allowSound.focus();
  };
  showCard(null);
  note.hidden = true;
  chip.hidden = true;

  return {
    allowSound,
    showCard,
    showSoundAllowed() {
      allowSound.textContent = words.tvSoundAllowed;
      allowSound.disabled = true;
    },
    showNote(shown) {
      hideNote?.();
      note.textContent = noteText(shown);
      note.hidden = false;
      hideNote = scheduler.after(NOTE_SHOWN_MS, () => {
        note.hidden = true;
        hideNote = null;
      });
    },
    showChip(link) {
      chip.hidden = link === null;
      chip.replaceChildren(
        ...(link === null ? [] : [qr(link), make("span", "", words.tvControlWithPhone)]),
      );
    },
  };
}

/** The start card's offer to control the slideshow with a phone (way B). */
export interface PhoneOffer {
  readonly button: HTMLButtonElement;
  /** In place of the button: the remote's QR code of `link`. */
  showLink(link: string): void;
  /** The button again, for a session that has ended. */
  reset(): void;
}

/** Puts the offer on the start card, after `bigPlay`. */
export function offerPhone(document: Document, words: TvPageWords, bigPlay: Element): PhoneOffer {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "again phone-offer";
  button.textContent = words.tvControlWithPhone;
  const linkShown = document.createElement("div");
  linkShown.className = "phone-link";
  bigPlay.after(button);
  let shown: Element = button;
  const swap = (next: Element) => {
    shown.replaceWith(next);
    shown = next;
  };
  return {
    button,
    showLink(link) {
      const text = document.createElement("p");
      text.textContent = words.tvScanToControl;
      const frame = document.createElement("div");
      frame.className = "qr-frame";
      frame.append(qrSvg(document, link, words.tvQrCode));
      linkShown.replaceChildren(frame, text);
      swap(linkShown);
    },
    reset: () => swap(button),
  };
}
