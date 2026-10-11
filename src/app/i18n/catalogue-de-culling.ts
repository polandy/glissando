import type { Message } from "./messages";

/** German copy of culling: bursts and blurry pictures set aside in the pictures step. */
export const deCulling = {
  "cull.checkingLabel": "auf Serien und Unschärfe geprüft …",
  "cull.setAside": "Beiseitegelegt · {count}",
  "cull.takeAllIn": "Alle übernehmen",
  "cull.why": "Diese sind nicht in der Diashow. Mit + übernimmst du eins.",
  "cull.burst": "Serie",
  "cull.sharpestKept": "· das schärfste bleibt",
  "cull.blurry": "Unscharf",
  "cull.kept": "Behalten",
  "cull.similar": "Ähnlich",
  "cull.takeIn": "Bild vom {date} um {time} übernehmen",
} as const satisfies Record<string, Message>;
