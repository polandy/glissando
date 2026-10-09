import type { Message } from "./messages";

/** German copy of the music editor; part of the German catalogue. */
export const deMusic = {
  "slideshow.musicWholeTrack": "ganzer Titel",
  "slideshow.musicExcerpt": "{from}–{to}",
  "slideshow.musicFades-in-and-out": "blendet ein und aus",
  "slideshow.musicFades-in": "blendet ein",
  "slideshow.musicFades-out": "blendet aus",
  "slideshow.musicSummary": "{excerpt} · {fades}",
  "music.crumb": "Musik",
  "music.trimmedTo": "{duration} · gekürzt auf {excerpt}",
  "music.start": "Anfang",
  "music.end": "Ende",
  "music.earlier": "{edge} eine halbe Sekunde früher",
  "music.later": "{edge} eine halbe Sekunde später",
  "music.slideshowLane": { one: "Diashow, ein Bild", other: "Diashow, {count} Bilder" },
  "music.listenStart": "Anfang anhören",
  "music.listenEnd": "Ende anhören",
  "music.listenFrom": "ab {time}",
  "music.listenUntil": "bis {time}",
  "music.hint":
    "Griffe ziehen oder mit den Pfeiltasten verschieben (Umschalt: 1 s). Die orange Linie zeigt die Lautstärke mit Ein- und Ausblende.",
  "music.excerpt": "Ausschnitt",
  "music.wholeTrack": "Ganzer Titel",
  "music.trimmed": "Gekürzt",
  "music.wholeTrackHint": "Die Diashow nutzt den ganzen Titel, {duration}.",
  "music.fadeIn": "Einblenden",
  "music.fadeOut": "Ausblenden",
  "music.fadeAutomatic": "Automatisch",
  "music.fadeOwn": "Eigene",
  "music.fadeOff": "Aus",
  "music.fadeShort": "Kurz",
  "music.fadeLong": "Lang",
  "music.fadeNone": "–",
  "music.automaticBecause": "Automatisch: {reason}.",
  "music.reason-excerpt-starts-mid-track": "kurz, weil der Ausschnitt mitten im Titel beginnt",
  "music.reason-track-starts": "aus, weil der Titel von vorn beginnt",
  "music.reason-slideshow-ends": "kurz, weil die Diashow bei {time} endet",
  "music.reason-excerpt-ends-early": "kurz, weil der Ausschnitt vor dem Titelende aufhört",
  "music.reason-track-ends": "aus, weil der Titel von selbst endet",
  "music.pictureTimes": "Bildzeiten",
  "music.noteShared": {
    one: "Das Bild ohne eigene Dauer bekommt den Ausschnitt: {share}. Die Diashow endet mit der Musik.",
    other:
      "{count} Bilder ohne eigene Dauer teilen sich den Ausschnitt: je {share}. Die Diashow endet mit der Musik.",
  },
  "music.noteOutlasts": "Die Diashow läuft {over} länger als die Musik.",
  "music.noteOutlastsWhy": {
    one: "Das Bild ohne eigene Dauer bekommt das Minimum von {min}; nach der Ausblende laufen die letzten Bilder still. Ein längerer Ausschnitt behebt das.",
    other:
      "{count} Bilder bekommen das Minimum von {min}; nach der Ausblende laufen die letzten Bilder still. Ein längerer Ausschnitt behebt das.",
  },
  "music.noteOutlastsAllOwn":
    "Jedes Bild hat eine eigene Dauer; nach der Ausblende laufen die letzten Bilder still.",
  "music.noteEndsEarly":
    "Jedes Bild hat eine eigene Dauer. Die Diashow endet nach {time}, die Musik blendet dort aus.",
  "music.noteEndsWithMusic": "Jedes Bild hat eine eigene Dauer. Die Diashow endet mit der Musik.",
} as const satisfies Record<string, Message>;
