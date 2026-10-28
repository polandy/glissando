import type { Message } from "./messages.ts";

/** German copy of the picture editor; part of the German catalogue, which defines the keys. */
export const deEditor = {
  "units.zoom": "{zoom}×",
  "slideshow.edit": "Bearbeiten",
  "slideshow.view": "Ansehen",
  "slideshow.viewFullScreen": "Vollbild ansehen",
  "slideshow.editPicture": "Bild bearbeiten",
  "slideshow.ownMotionBadge": "eigen",
  "slideshow.pictureLabelOwnMotion": "Bild {number}, aufgenommen am {date}, eigene Bewegung",
  "slideshow.automaticWithOwn": "automatisch, {count} eigene",
  "editor.crumb": "Bild {number}",
  "editor.position": "Bild {number} von {count}",
  "editor.counter": "{number} / {count}",
  "editor.previous": "Vorheriges Bild",
  "editor.next": "Nächstes Bild",
  "editor.kenBurns": "Ken Burns",
  "editor.automatic": "Automatisch",
  "editor.own": "Eigene Bewegung",
  "editor.frames": "Rahmen",
  "editor.start": "Start",
  "editor.end": "Ende",
  "editor.zoomLabel": "Zoom",
  "editor.startFrame": "Startrahmen, Zoom {zoom}",
  "editor.endFrame": "Endrahmen, Zoom {zoom}",
  "editor.editStartFrame": "Startrahmen bearbeiten",
  "editor.editEndFrame": "Endrahmen bearbeiten",
  "editor.playPreview": "Vorschau abspielen",
  "editor.pausePreview": "Vorschau anhalten",
  "editor.previewTime": "{current} / {total}",
  "editor.swap": "Start und Ende tauschen",
  "editor.reset": "Zurück auf automatisch",
  "editor.alreadyAutomatic": "Die Bewegung ist schon automatisch",
  "editor.motionAutomatic": "Bewegung wieder automatisch",
  "editor.durationAutomatic": "Dauer wieder automatisch",
  "editor.transitionAutomatic": "Übergang wieder automatisch",
  "editor.hintWide":
    "Ziehen verschiebt den Rahmen, an den Ecken ziehen zoomt · Mausrad zoomt · Pfeiltasten, + und −",
  "editor.hintNarrow": "Ziehen verschiebt den Rahmen, Ecken oder zwei Finger zoomen.",
  "editor.focusChipFace": "Gesicht",
  "editor.focusChipSubject": "Motiv",
  "editor.focusChipImmich": "Immich",
  "editor.focusMarkerFace": "Fokus: Gesicht erkannt",
  "editor.focusMarkerSubject": "Fokus: Motiv erkannt",
  "editor.focusMarkerImmich": "Fokus: Gesichter von Immich erkannt",
  "editor.focusFace": "Gesicht erkannt – die Bewegung zielt darauf.",
  "editor.focusSubject": "Motiv erkannt – die Bewegung zielt darauf.",
  "editor.focusImmich": "Gesichter von Immich – die Bewegung zielt darauf.",
  "editor.focusScenery": "Landschaft – die Bewegung schwenkt seitwärts.",
  "editor.focusNone": "Kein Motiv erkannt – die Bewegung bleibt mittig.",
  "editor.focusWaiting": "Noch nicht angesehen – wartet in der Warteschlange.",
  "editor.focusOutdatedFace":
    "Gesicht von einer älteren Version erkannt – wird bald erneut gesucht.",
  "editor.focusOutdatedSubject":
    "Motiv von einer älteren Version erkannt – wird bald erneut gesucht.",
  "editor.focusOutdatedImmich":
    "Gesichter von Immich von einer älteren Version erkannt – wird bald erneut gesucht.",
  "editor.focusOutdatedScenery":
    "Landschaft von einer älteren Version erkannt – wird bald erneut gesucht.",
  "editor.focusOutdatedNone":
    "Kein Motiv von einer älteren Version erkannt – wird bald erneut gesucht.",
  "editor.focusFailed": "Dieses Bild konnte nicht angesehen werden.",
  "editor.focusWaitingForServer": "Wartet, bis dein Glissando-Server sich dieses Bild ansieht.",
  "editor.lookNow": "Jetzt ansehen",
  "editor.lookAgain": "Erneut ansehen",
  "editor.lookAgainNow": "Jetzt erneut ansehen",
  "editor.tryAgain": "Erneut versuchen",
  "editor.ownMotionFace":
    "Eigene Bewegung – dein Start und Ende bleiben, was auch gefunden wird. Der Fokus (Gesicht erkannt) wird nur verwendet, wenn du zurück auf automatisch gehst.",
  "editor.ownMotionSubject":
    "Eigene Bewegung – dein Start und Ende bleiben, was auch gefunden wird. Der Fokus (Motiv erkannt) wird nur verwendet, wenn du zurück auf automatisch gehst.",
  "editor.ownMotionImmich":
    "Eigene Bewegung – dein Start und Ende bleiben, was auch gefunden wird. Der Fokus (Gesichter von Immich) wird nur verwendet, wenn du zurück auf automatisch gehst.",
  "editor.ownMotionScenery":
    "Eigene Bewegung – dein Start und Ende bleiben, was auch gefunden wird. Der Fokus (Landschaft) wird nur verwendet, wenn du zurück auf automatisch gehst.",
  "editor.ownMotionNone":
    "Eigene Bewegung – dein Start und Ende bleiben, was auch gefunden wird. Der Fokus (kein Motiv erkannt) wird nur verwendet, wenn du zurück auf automatisch gehst.",
  "editor.searchingFocus": "Fokus wird gesucht …",
  "editor.caption": "Bildtitel",
  "editor.captionPlaceholder": "z. B. Abends am Steg",
  "editor.captionCount": "{count} / {max}",
  "editor.captionClear": "Bildtitel leeren",
  "editor.captionHint":
    "Steht im Player unten links und blendet mit dem Bild ein und aus. Leer: kein Titel.",
} as const satisfies Record<string, Message>;
