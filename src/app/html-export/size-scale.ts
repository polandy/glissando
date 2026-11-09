import type { MessageKey } from "../i18n/messages";
import type { PageSizeId } from "../../html-export/plan";

/** The shared Small / Standard / Large names, one scale in every export sheet. */
export const PAGE_SIZE_NAME_KEY: Readonly<Record<PageSizeId, MessageKey>> = {
  small: "sizeScale.small",
  sharp: "sizeScale.standard",
  "4k": "sizeScale.large",
};
