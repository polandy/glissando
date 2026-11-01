import type { IconName } from "../../../ui-kit/icons";

/** One of the selection bar's moves or extras, shown inline on a wide screen and in "More" on a narrow one. */
export interface BarItem {
  readonly key: "earlier" | "later" | "chapter" | "moveTo";
  readonly icon: IconName;
  readonly label: string;
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
): BarItem {
  return { key, icon: ICONS[key], label, disabled, run };
}
