import type { deServer } from "./catalogue-de-server";
import type { Catalogue } from "./messages";

/** English copy of slideshows on the Glissando server; typed to the German keys. */
export const enServer: Pick<Catalogue, keyof typeof deServer> = {
  "server.sectionDevice": "On this device",
  "server.sectionDeviceEmpty": "Nothing on this device yet.",
  "server.sectionServer": "On your Glissando server",
  "server.sectionLead": "Pictures stay in Immich. Shared by everyone who opens this Glissando.",
  "server.sectionOffline":
    "Offline. Server slideshows play again once this device reaches your Glissando server. To take one along, open it and choose “Keep a copy on this device”.",
  "server.chip": "Server",
  "server.needsServer": "Needs your Glissando server",
  "server.whereTitle": "Where should it live?",
  "server.whereDevice": "This device",
  "server.whereDeviceText": "Pictures are downloaded and stored here. Plays offline.",
  "server.whereServer": "Glissando server",
  "server.whereServerText": "Pictures stay in Immich. Plays on every device at home, online.",
  "server.whereChosen": "Chosen for this slideshow. Clear the pictures to change it.",
  "server.devicePictures": "Pictures from this device",
  "server.deviceDisabled":
    "A server slideshow only links photos from Immich. Upload these to Immich first, or save this slideshow on this device.",
  "server.linked":
    "Linked from Immich. Nothing is downloaded now; playing loads the pictures from Immich.",
  "server.creating": "Saving on your Glissando server …",
  "server.createFailed": "Couldn't create the slideshow. Your Glissando server isn't answering.",
  "server.tryAgain": "Try again",
  "server.storageServerText": "Pictures linked from Immich · edits saved for everyone",
  "server.saved": "Saved",
  "server.savingEdit": "Saving …",
  "server.storageAllImmich": {
    one: "{count} from Immich · plays offline",
    other: "All {count} from Immich · plays offline",
  },
  "server.storageAllDevice": {
    one: "{count} from this device · plays offline",
    other: "All {count} from this device · plays offline",
  },
  "server.storageMixed": "{immich} from Immich, {device} from this device · plays offline",
  "server.changedElsewhere": "Changed on another device. Showing the latest version.",
  "server.saveFailed": "Couldn't save. Your Glissando server isn't answering.",
  "server.missingTile": "No longer in Immich",
  "server.missingNotice": {
    one: "{count} picture is no longer in Immich. It is skipped when playing.",
    other: "{count} pictures are no longer in Immich. They are skipped when playing.",
  },
  "server.removeMissing": { one: "Remove it", other: "Remove them" },
  "server.immichNotAnswering": "Immich isn't answering",
  "server.keepCopy": "Keep a copy on this device",
  "server.keepCopyHint": {
    one: "Downloads {count} picture. Plays offline.",
    other: "Downloads {count} pictures. Plays offline.",
  },
  "server.exportHint": "A .glissando file, pictures downloaded from Immich",
  "server.deleteHint": "For every device",
  "server.deleteText": {
    one: "The slideshow is removed from your Glissando server, for every device. Its one picture stays in Immich. This cannot be undone.",
    other:
      "The slideshow is removed from your Glissando server, for every device. Its {count} pictures stay in Immich. This cannot be undone.",
  },
  "server.keepCopyTitle": "Keep a copy on this device?",
  "server.keepCopyText": {
    one: "Downloads {count} picture from Immich and the music. The copy plays offline and appears under “On this device”.",
    other:
      "Downloads {count} pictures from Immich and the music. The copy plays offline and appears under “On this device”.",
  },
  "server.keepCopyTextNoMusic": {
    one: "Downloads {count} picture from Immich. The copy plays offline and appears under “On this device”.",
    other:
      "Downloads {count} pictures from Immich. The copy plays offline and appears under “On this device”.",
  },
  "server.keepCopyIndependent": "Later edits to either one stay in that one.",
  "server.keepCopyConfirm": "Download and keep",
  "server.copying": "Copying “{title}” … {percent} %",
  "server.copied": "Copied to this device",
  "server.copyFailed": "Couldn't copy the slideshow.",
  "server.copyMissing": "A picture is no longer in Immich. Remove it, then the copy works.",
  "server.open": "Open",
  "server.saveOnServer": "Save on the server",
  "server.saveOnServerHint": "A copy for every device at home",
  "server.saveTitle": "Save on the server?",
  "server.saveText": {
    one: "Every device that opens this Glissando can then play and edit it. Its one picture stays in Immich and is linked, not uploaded.",
    other:
      "Every device that opens this Glissando can then play and edit it. Its {count} pictures stay in Immich and are linked, not uploaded.",
  },
  "server.saveMusic": "The music ({size}) is stored on the server.",
  "server.saveIndependent":
    "The slideshow on this device stays as it is. The two copies are independent.",
  "server.onlyHereTitle": {
    one: "{count} picture is only on this device",
    other: "{count} pictures are only on this device",
  },
  "server.onlyHereText":
    "A server slideshow links photos from Immich and stores no pictures itself. These came from this device:",
  "server.onlyHereHint":
    "Upload them to Immich and add them from there, or save the slideshow without them.",
  "server.saveWithout": { one: "Save without this one", other: "Save without these {count}" },
  "server.savedOnServer": "Saved on the server",
  "server.saveOnServerFailed":
    "Couldn't save on the server. Your Glissando server isn't answering.",
  "server.exportFromImmich": "pictures downloaded from Immich",
};
