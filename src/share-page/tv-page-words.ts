/**
 * The share page's words as the TV page (`tvPage.*`, dev-docs/tv_remote/TV_PAGE.md); part of
 * `SharePageWords`, so built into every share page in both languages.
 */
export interface TvPageWords {
  /** The wordmark on the TV's cards. */
  readonly appName: string;
  readonly tvPairTitle: string;
  readonly tvPairText: string;
  readonly tvAllowSound: string;
  readonly tvSoundAllowed: string;
  readonly tvConnectedTitle: string;
  readonly tvConnectedText: string;
  /** "That was “{title}”". */
  readonly tvEndedTitle: string;
  readonly tvEndedText: string;
  readonly tvUnreachableTitle: string;
  readonly tvUnreachableText: string;
  readonly tvControlWithPhone: string;
  readonly tvScanToControl: string;
  /** The QR code's accessible name. */
  readonly tvQrCode: string;
  readonly tvNotePlaying: string;
  readonly tvNotePaused: string;
  readonly tvNoteNext: string;
  readonly tvNotePrevious: string;
  /** "Volume {percent}%". */
  readonly tvNoteVolume: string;
}

export const TV_TEXT_KEYS = [
  "appName",
  "tvPairTitle",
  "tvPairText",
  "tvAllowSound",
  "tvSoundAllowed",
  "tvConnectedTitle",
  "tvConnectedText",
  "tvEndedTitle",
  "tvEndedText",
  "tvUnreachableTitle",
  "tvUnreachableText",
  "tvControlWithPhone",
  "tvScanToControl",
  "tvQrCode",
  "tvNotePlaying",
  "tvNotePaused",
  "tvNoteNext",
  "tvNotePrevious",
  "tvNoteVolume",
] as const satisfies readonly (keyof TvPageWords)[];
