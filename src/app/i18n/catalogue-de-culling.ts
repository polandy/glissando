import type { Message } from "./messages.ts";

/** German copy of culling: similar shots and blurry pictures set aside in the pictures step. */
export const deCulling = {
  "cull.checkingLabel": "auf ähnliche Aufnahmen und Unschärfe geprüft …",
  "cull.setAside": "Beiseitegelegt · {count}",
  "cull.takeAllIn": "Alle übernehmen",
  "cull.why": "Diese sind nicht in der Diashow. Mit + übernimmst du eins.",
  "cull.similarGroup": "Ähnlich · {when}",
  "cull.similarGroupSharpestKept": "Ähnlich · {when} · das schärfste bleibt",
  "cull.blurry": "Unscharf",
  "cull.kept": "Behalten",
  "cull.similar": "Ähnlich",
  "cull.takeIn": "Bild vom {date} um {time} übernehmen",
} as const satisfies Record<string, Message>;
