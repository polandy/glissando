import type { PictureTile } from "../view-models";
import type { StripSelection } from "./strip-selection";

/** The selection bar's pair action (ADR-0028): split a pair, or pair an alone picture again. */
export interface PairAction {
  readonly kind: "split" | "rejoin";
  readonly run: () => void;
}

/**
 * The pair action for the one selected picture: "Split" when it shares a slide, "Pair again" when
 * only its alone mark keeps it single; none otherwise, and none while selecting several.
 */
export function pairAction(
  pictures: readonly PictureTile[],
  selection: StripSelection,
  onSplitPair: (pictureId: string) => void,
  onRejoinPair: (pictureId: string) => void,
): PairAction | undefined {
  if (selection.several || selection.ids.size !== 1) {
    return undefined;
  }
  const [selectedId] = selection.ids;
  const picture = pictures.find((candidate) => candidate.id === selectedId);
  if (picture?.pairedWithNumber != null) {
    return { kind: "split", run: () => onSplitPair(picture.id) };
  }
  if (picture?.rejoinsWithNumber != null) {
    return { kind: "rejoin", run: () => onRejoinPair(picture.id) };
  }
  return undefined;
}
