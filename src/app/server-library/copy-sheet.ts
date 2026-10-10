import type { StoredSlideshow } from "../../library/stored-slideshow";
import { partitionForServer } from "../../server-library/save-on-server";
import type { Translator } from "../i18n/translator";

/** A confirmation sheet before a copy between the device and the server. */
export interface CopySheet {
  readonly title: string;
  /** One paragraph each. */
  readonly message: readonly string[];
  /** The pictures the copy leaves out, listed after the message. */
  readonly fileNames: readonly string[];
  /** A paragraph after the list. */
  readonly closing: string | null;
  /** The confirming button's label; null: nothing can be copied, only cancelled. */
  readonly confirm: string | null;
}

/** "Keep a copy on this device?" (`dev-docs/SERVER_LIBRARY.md`, A server slideshow's screen). */
export function keepCopySheet(
  { t }: Pick<Translator, "t">,
  serverSlideshow: StoredSlideshow,
): CopySheet {
  const count = serverSlideshow.pictures.length;
  const text =
    serverSlideshow.music === undefined ? "server.keepCopyTextNoMusic" : "server.keepCopyText";
  return {
    title: t("server.keepCopyTitle"),
    message: [t(text, { count }), t("server.keepCopyIndependent")],
    fileNames: [],
    closing: null,
    confirm: t("server.keepCopyConfirm"),
  };
}

/**
 * "Save on the server?", or, with pictures only on this device, the sheet listing them that offers
 * to save without them; `musicBytes` is the music's size, null without music.
 */
export function saveOnServerSheet(
  { t, formatBytes }: Pick<Translator, "t" | "formatBytes">,
  deviceSlideshow: StoredSlideshow,
  musicBytes: number | null,
): CopySheet {
  const { linked, deviceOnly } = partitionForServer(deviceSlideshow);
  if (deviceOnly.length > 0) {
    return {
      title: t("server.onlyHereTitle", { count: deviceOnly.length }),
      message: [t("server.onlyHereText")],
      fileNames: deviceOnly.map((picture) => picture.fileName),
      closing: t("server.onlyHereHint"),
      confirm: linked.length > 0 ? t("server.saveWithout", { count: deviceOnly.length }) : null,
    };
  }
  const linkedText = t("server.saveText", { count: linked.length });
  const musicText =
    musicBytes === null ? null : t("server.saveMusic", { size: formatBytes(musicBytes) });
  return {
    title: t("server.saveTitle"),
    message: [
      musicText === null ? linkedText : `${linkedText} ${musicText}`,
      t("server.saveIndependent"),
    ],
    fileNames: [],
    closing: null,
    confirm: t("server.saveOnServer"),
  };
}
