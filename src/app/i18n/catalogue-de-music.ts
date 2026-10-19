import type { Message } from "./messages.ts";

/** German copy of music: its import and the music editor; part of the German catalogue. */
export const deMusic = {
  "import.convertingButton": "Wird umgewandelt\u00a0…",
  "import.convertedFrom": "Auf diesem Gerät aus {format} umgewandelt",
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
  "music.noteSharedOnTheBeat": {
    one: "Das Bild ohne eigene Dauer bekommt den Ausschnitt: {share}. Die Diashow endet mit der Musik.",
    other:
      "{count} Bilder ohne eigene Dauer teilen sich den Ausschnitt: je etwa {share}. Die Diashow endet mit der Musik.",
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
  "music.noteOwnSeconds":
    "Jedes Bild ohne eigene Dauer bleibt {seconds}. Die Diashow dauert {time}, die Musik blendet dort aus.",
  "music.noteOwnSecondsOnTheBeat":
    "Jedes Bild ohne eigene Dauer bleibt etwa {seconds}, jeder Wechsel auf dem nächsten Schlag. Die Diashow dauert {time}, die Musik blendet dort aus.",
  "music.noteOutlastsOwnSeconds":
    "Jedes Bild ohne eigene Dauer bleibt {seconds}; nach der Ausblende laufen die letzten Bilder still. Kürzere Bilder, längere Musik oder „Musik füllen“ beheben das.",
  "music.pictureLength": "Bilddauer",
  "music.aboutSecondsEach": "Je etwa {seconds}",
  "music.fillTheMusic": "Musik füllen",
  "music.pictureChanges": "Bildwechsel",
  "music.beatsPerMinute": "{bpm} BPM",
  "music.onTheBeat": "Im Takt",
  "music.evenly": "Gleichmäßig",
  "music.onTheBeatHint":
    "Jeder automatische Wechsel landet auf einem Schlag der Musik; ein Übergang dauert ganze Schläge.",
  "music.ownDurationsOffBeat": {
    one: "Bild {pictures} behält seine eigene Dauer, darum kann der Wechsel danach zwischen die Schläge fallen.",
    other:
      "Die Bilder {pictures} behalten ihre eigene Dauer, darum kann der Wechsel nach jedem zwischen die Schläge fallen.",
  },
  "music.evenlyHint": "Die Bilder teilen sich die Musik gleichmäßig, unabhängig von ihrem Takt.",
  "music.evenlyHintSeconds": "Jedes Bild bleibt genau {seconds}, unabhängig vom Takt.",
  "music.listeningForBeat":
    "Glissando hört den Takt heraus\u00a0… Bis dahin teilen sich die Bilder die Musik gleichmäßig.",
  "music.listeningForBeatSeconds":
    "Glissando hört den Takt heraus\u00a0… Bis dahin bleibt jedes Bild genau {seconds}.",
  "music.noSteadyBeatSeconds":
    "In dieser Musik ist kein gleichmäßiger Takt zu finden. Jedes Bild bleibt genau {seconds}.",
  "music.musicUndecodableSeconds":
    "Glissando konnte den Takt dieser Musik nicht heraushören. Jedes Bild bleibt genau {seconds}.",
  "music.noSteadyBeat":
    "In dieser Musik ist kein gleichmäßiger Takt zu finden. Die Bilder teilen sie sich gleichmäßig.",
  "music.musicUndecodable":
    "Glissando konnte den Takt dieser Musik nicht heraushören. Die Bilder teilen sie sich gleichmäßig.",
  "music.volume": "Lautstärke",
  "music.volumeLevelled": "Angeglichen",
  "music.volumeOwn": "Eigene",
  "music.volumeMeasuring": "Wird gemessen…",
  "music.volumeSubUnmeasured": "Spielt unangeglichen, bis gemessen",
  "music.volumeSubAsFarAsItGoes": "So laut wie möglich, ohne zu verzerren",
  "music.volumeSubSameLoudness": "Gleich laut wie die anderen Titel",
  "music.volumeSubLouder": "Lauter als angeglichen",
  "music.volumeSubQuieter": "Leiser als angeglichen",
  "music.volumeHintMeasuring": "Die Lautheit wird gemessen… bis dahin spielt er unangeglichen.",
  "music.volumeHintUndecodable":
    "Glissando konnte die Lautheit dieses Titels nicht heraushören; er spielt unangeglichen.",
  "music.volumeHintCappedShort": "{shortDb} dB unter dem Ziel, um nicht zu verzerren.",
  "music.volumeHintCappedMax": "So laut wie möglich, ohne zu verzerren.",
  "music.volumeHintLevelledBy": "Um {levelDb} angeglichen, um die anderen Titel zu erreichen.",
  "music.volumeReset": "Zurück auf angeglichen",
  "music.volumeListen": "Anhören",
  "music.volumeListenStop": "Stopp",
  "music.volumeListenAt": "bei dieser Lautstärke, an der lautesten Stelle",
  "music.volumeListenOriginal": "Originaldatei, unangeglichen",
  "music.volumeOriginalFile": "Originaldatei",
  "music.volumeComparison": "Lautstärke der Titel",
  "music.volumeComparisonHint": "Graue Linie: Originaldatei",
} as const satisfies Record<string, Message>;
