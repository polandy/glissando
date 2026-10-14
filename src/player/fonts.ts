/** Loads font faces before text is drawn with them; `document.fonts` is one implementation. */
export interface Fonts {
  load(font: string): Promise<unknown>;
}

/** One face of a family: weight and style together with the family select it. */
export interface FontSpec {
  readonly family: string;
  readonly weight: number;
  readonly style: "normal" | "italic";
}

/** Any size loads the face; a caller's own text size changes with the screen. */
const FONT_LOAD_SIZE_PX = 16;

function cssFontShorthand(spec: FontSpec): string {
  const italic = spec.style === "italic" ? "italic " : "";
  return `${italic}${spec.weight} ${FONT_LOAD_SIZE_PX}px ${spec.family}`;
}

/**
 * Loads every face in `specs` through `fonts`, so text set in any of them draws without first
 * flashing a fallback font. Settles once all have settled; rejects if any does.
 */
export function loadFonts(fonts: Fonts, specs: readonly FontSpec[]): Promise<unknown> {
  return Promise.all(specs.map((spec) => fonts.load(cssFontShorthand(spec))));
}
