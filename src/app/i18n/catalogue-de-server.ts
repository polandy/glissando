import type { Message } from "./messages";

/** German copy of slideshows on the Glissando server; part of the German catalogue. */
export const deServer = {
  "server.sectionDevice": "Auf diesem Gerät",
  "server.sectionServer": "Auf deinem Glissando-Server",
  "server.sectionLead": "Die Bilder bleiben in Immich. Für alle, die dieses Glissando öffnen.",
  "server.sectionOffline":
    "Offline. Server-Diashows laufen wieder, sobald dieses Gerät deinen Glissando-Server erreicht. Um eine mitzunehmen, öffne sie und wähle „Kopie auf diesem Gerät behalten“.",
  "server.chip": "Server",
  "server.needsServer": "Braucht deinen Glissando-Server",
  "server.whereTitle": "Wo soll sie liegen?",
  "server.whereDevice": "Dieses Gerät",
  "server.whereDeviceText":
    "Die Bilder werden heruntergeladen und hier gespeichert. Läuft offline.",
  "server.whereServer": "Glissando-Server",
  "server.whereServerText": "Die Bilder bleiben in Immich. Läuft auf jedem Gerät zu Hause, online.",
  "server.whereChosen": "Für diese Diashow gewählt. Entferne die Bilder, um es zu ändern.",
  "server.devicePictures": "Bilder von diesem Gerät",
  "server.deviceDisabled":
    "Eine Server-Diashow verknüpft nur Fotos aus Immich. Lade diese zuerst in Immich hoch oder speichere die Diashow auf diesem Gerät.",
  "server.linked":
    "Aus Immich verknüpft. Jetzt wird nichts heruntergeladen; beim Abspielen kommen die Bilder aus Immich.",
  "server.creating": "Wird auf deinem Glissando-Server gespeichert …",
  "server.createFailed": "Die Diashow wurde nicht erstellt. Dein Glissando-Server antwortet nicht.",
  "server.storageServerText": "Bilder aus Immich verknüpft · Änderungen für alle gespeichert",
  "server.saved": "Gespeichert",
  "server.savingEdit": "Wird gespeichert …",
  "server.storageAllImmich": {
    one: "{count} aus Immich · läuft offline",
    other: "Alle {count} aus Immich · läuft offline",
  },
  "server.storageAllDevice": {
    one: "{count} von diesem Gerät · läuft offline",
    other: "Alle {count} von diesem Gerät · läuft offline",
  },
  "server.storageMixed": "{immich} aus Immich, {device} von diesem Gerät · läuft offline",
  "server.changedElsewhere": "Auf einem anderen Gerät geändert. Hier ist die neueste Fassung.",
  "server.saveFailed": "Nicht gespeichert. Dein Glissando-Server antwortet nicht.",
  "server.missingTile": "Nicht mehr in Immich",
  "server.missingNotice": {
    one: "{count} Bild ist nicht mehr in Immich. Es wird beim Abspielen übersprungen.",
    other: "{count} Bilder sind nicht mehr in Immich. Sie werden beim Abspielen übersprungen.",
  },
  "server.removeMissing": { one: "Entfernen", other: "Entfernen" },
  "server.immichNotAnswering": "Immich antwortet nicht",
  "server.keepCopy": "Kopie auf diesem Gerät behalten",
  "server.keepCopyHint": {
    one: "Lädt {count} Bild herunter. Läuft offline.",
    other: "Lädt {count} Bilder herunter. Läuft offline.",
  },
  "server.exportHint": "Eine .glissando-Datei, Bilder aus Immich heruntergeladen",
  "server.deleteHint": "Für alle Geräte",
  "server.deleteText": {
    one: "Die Diashow wird für alle Geräte vom Glissando-Server entfernt. Ihr Bild bleibt in Immich. Das lässt sich nicht rückgängig machen.",
    other:
      "Die Diashow wird für alle Geräte vom Glissando-Server entfernt. Ihre {count} Bilder bleiben in Immich. Das lässt sich nicht rückgängig machen.",
  },
  "server.keepCopyTitle": "Kopie auf diesem Gerät behalten?",
  "server.keepCopyText": {
    one: "Lädt {count} Bild aus Immich und die Musik herunter. Die Kopie läuft offline und erscheint unter „Auf diesem Gerät“.",
    other:
      "Lädt {count} Bilder aus Immich und die Musik herunter. Die Kopie läuft offline und erscheint unter „Auf diesem Gerät“.",
  },
  "server.keepCopyTextNoMusic": {
    one: "Lädt {count} Bild aus Immich herunter. Die Kopie läuft offline und erscheint unter „Auf diesem Gerät“.",
    other:
      "Lädt {count} Bilder aus Immich herunter. Die Kopie läuft offline und erscheint unter „Auf diesem Gerät“.",
  },
  "server.keepCopyIndependent": "Spätere Änderungen bleiben in der jeweiligen Diashow.",
  "server.keepCopyConfirm": "Herunterladen und behalten",
  "server.copying": "„{title}“ wird kopiert … {percent} %",
  "server.copied": "Auf dieses Gerät kopiert",
  "server.copyFailed": "Die Kopie ist fehlgeschlagen.",
  "server.copyMissing": "Ein Bild ist nicht mehr in Immich. Entferne es, dann klappt die Kopie.",
  "server.open": "Öffnen",
  "server.saveOnServer": "Auf dem Server speichern",
  "server.saveOnServerHint": "Eine Kopie für alle Geräte zu Hause",
  "server.saveTitle": "Auf dem Server speichern?",
  "server.saveText": {
    one: "Jedes Gerät, das dieses Glissando öffnet, kann sie dann abspielen und bearbeiten. Ihr Bild bleibt in Immich und wird verknüpft, nicht hochgeladen.",
    other:
      "Jedes Gerät, das dieses Glissando öffnet, kann sie dann abspielen und bearbeiten. Ihre {count} Bilder bleiben in Immich und werden verknüpft, nicht hochgeladen.",
  },
  "server.saveMusic": "Die Musik ({size}) wird auf dem Server gespeichert.",
  "server.saveIndependent":
    "Die Diashow auf diesem Gerät bleibt, wie sie ist. Die beiden Kopien sind unabhängig voneinander.",
  "server.onlyHereTitle": {
    one: "{count} Bild ist nur auf diesem Gerät",
    other: "{count} Bilder sind nur auf diesem Gerät",
  },
  "server.onlyHereText":
    "Eine Server-Diashow verknüpft Fotos aus Immich und speichert selbst keine Bilder. Diese kamen von diesem Gerät:",
  "server.onlyHereHint":
    "Lade sie in Immich hoch und füge sie von dort hinzu, oder speichere die Diashow ohne sie.",
  "server.saveWithout": { one: "Ohne dieses speichern", other: "Ohne diese {count} speichern" },
  "server.savedOnServer": "Auf dem Server gespeichert",
  "server.saveOnServerFailed":
    "Nicht auf dem Server gespeichert. Dein Glissando-Server antwortet nicht.",
  "server.exportFromImmich": "Bilder aus Immich heruntergeladen",
} as const satisfies Record<string, Message>;
