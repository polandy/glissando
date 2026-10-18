import type { Message } from "./messages.ts";

/** German copy of index.html's choose-folder card (dev-docs/library/GLISSANDO_FILE.md). */
export const deFilePage = {
  "filePage.chooseTitle": "Wähle den Ordner dieser Diashow",
  "filePage.chooseText":
    "Wähle den Ordner, in den du die .glissando-Datei entpackt hast – den mit dieser index.html. Erst dann darf der Browser die Bilder und die Musik darin lesen.",
  "filePage.chooseFolder": "Ordner wählen",
  "filePage.noManifest":
    "In diesem Ordner liegt keine glissando.json. Entpacke die ganze .glissando-Datei und wähle dann den Ordner mit der index.html.",
  "filePage.missing":
    "In diesem Ordner fehlen Dateien, die die Diashow braucht: {files}. Entpacke die ganze .glissando-Datei noch einmal.",
  "filePage.damaged": "glissando.json lässt sich nicht lesen: {reason}",
  "filePage.foreign": "Die glissando.json in diesem Ordner ist keine Glissando-Diashow.",
  "filePage.newer":
    "Diese Diashow stammt aus einem neueren Glissando als diese Seite. Öffne die .glissando-Datei stattdessen in Glissando: https://polandy.github.io/glissando/",
} as const satisfies Record<string, Message>;
