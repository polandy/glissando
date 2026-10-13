import { PAGE_STATE_ATTRIBUTE } from "../html-export/page-contract";
import { CAPTION_FONT_FAMILY, CAPTION_FONT_WEIGHT } from "../player/caption-layout";

/** Any size: `document.fonts.load` only needs a font shorthand. */
const FONT_PROBE_SIZE = "16px";

/** Captions are drawn into the picture, so the font has to be there before the first frame. */
export async function loadCaptionFont(): Promise<void> {
  await document.fonts.load(`${CAPTION_FONT_WEIGHT} ${FONT_PROBE_SIZE} ${CAPTION_FONT_FAMILY}`);
}

/** A page that could not start: the error in plain text, and the state `error`. */
export function showStartFailure(error: unknown): void {
  console.error("the slideshow page could not start", error);
  const message = document.createElement("p");
  message.textContent = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  document.body.append(message);
  document.documentElement.setAttribute(PAGE_STATE_ATTRIBUTE, "error");
}
