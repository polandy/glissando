import type { Catalogue } from "./messages.ts";
import type { deView } from "./catalogue-de-view.ts";

/** English copy of the full-screen picture viewer; typed to the German keys. */
export const enView: Pick<Catalogue, keyof typeof deView> = {
  "view.open": "View picture from {date} at {time}",
  "view.label": "Picture from {date}",
  "view.position": "{position} of {count}",
  "view.setAside": "Set aside: {reason}",
  "view.previous": "Previous picture",
  "view.next": "Next picture",
  "view.takeIn": "Take in",
  "view.pictures": "All pictures",
  "view.showPicture": "Show picture {position}",
};
