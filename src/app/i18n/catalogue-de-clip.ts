import type { Message } from "./messages.ts";

/** German copy of video slides (dev-docs/player/VIDEO_SLIDES.md); part of the German catalogue. */
export const deClip = {
  "clip.badge": "Video",
  "clip.badgeLength": "Video, {length}",
  "clip.cutFlag": "Ausschnitt",
  "clip.longNotice": {
    one: "{count} Video ist länger als {max}. Im Film läuft ein Ausschnitt bis {max}; du wählst ihn später im Clip-Editor.",
    other:
      "{count} Videos sind länger als {max}. Im Film läuft jeweils ein Ausschnitt bis {max}; du wählst ihn später im Clip-Editor.",
  },
  "clip.refusedUnplayable":
    "„{fileName}“ lässt sich auf diesem Gerät nicht abspielen. Das Format wird hier nicht unterstützt.",
  "clip.refusedTooLarge": "„{fileName}“ ist größer als {max} und wird nicht übernommen.",
  "clip.refusedTooShort": "„{fileName}“ ist kürzer als {min} und wird nicht übernommen.",
  "clip.crumb": "Clip {number}",
  "clip.previewLabel": "Vorschau des Ausschnitts",
  "clip.scrub": "Position im Ausschnitt",
  "clip.play": "Abspielen",
  "clip.pause": "Pause",
  "clip.previewFailed": "Dieses Gerät kann den Clip nicht abspielen.",
  "clip.missing": "Der Clip liegt nicht mehr auf diesem Gerät.",
  "clip.strip": "Ausschnitt wählen",
  "clip.noSound": "Kein Ton in diesem Clip",
  "clip.handleStart": "Anfang",
  "clip.handleEnd": "Ende",
  "clip.from": "Von",
  "clip.to": "Bis",
  "clip.inFilm": "Im Film: {length}",
  "clip.sound": "Ton",
  "clip.soundOn": "An",
  "clip.soundOff": "Aus",
  "clip.volume": "Lautstärke",
  "clip.volumeValue": "{percent} %",
  "clip.duck": "Musik währenddessen leiser",
  "clip.transitionNote":
    "Der Übergang zur nächsten Slide läuft in den letzten {length} des Ausschnitts mit.",
  "clip.reset": "Zurücksetzen",
  "clip.done": "Fertig",
} as const satisfies Record<string, Message>;
