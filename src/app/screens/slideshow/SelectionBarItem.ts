import type { IconName } from "../../../ui-kit/icons";
import type { getTranslator } from "../../i18n/context";

type Translate = ReturnType<typeof getTranslator>["t"];

/** One of the selection bar's moves or extras. */
export interface BarItem {
  readonly key: "earlier" | "later" | "chapter" | "moveTo";
  readonly icon: IconName;
  readonly label: string;
  /** The label on a narrow screen, where the icon sits over it; the long one when omitted. */
  readonly shortLabel: string;
  /** Looks off and does nothing, but keeps its place in the tab order. */
  readonly disabled: boolean;
  readonly run: () => void;
}

const ICONS: Readonly<Record<BarItem["key"], IconName>> = {
  earlier: "chevronLeft",
  later: "chevronRight",
  chapter: "chapter",
  moveTo: "swap",
};

export function barItem(
  key: BarItem["key"],
  label: string,
  run: () => void,
  disabled = false,
  shortLabel = label,
): BarItem {
  return { key, icon: ICONS[key], label, shortLabel, disabled, run };
}

/** Insert chapter before the selected picture: "Chapter" under the icon on a narrow screen. */
export const chapterItem = (t: Translate, run: () => void): BarItem =>
  barItem(
    "chapter",
    t("chapters.insertChapterBefore"),
    run,
    false,
    t("chapters.insertChapterShort"),
  );

/** Move to…: "Move" under the icon on a narrow screen. */
export const moveToItem = (t: Translate, run: () => void): BarItem =>
  barItem("moveTo", t("slideshow.moveTo"), run, false, t("slideshow.moveToShort"));
