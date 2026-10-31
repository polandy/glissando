import type { Message } from "./messages.ts";

/** German copy of music: its import and the music editor; part of the German catalogue. */
export const deMusic = {
  "import.convertingButton": "Wird umgewandelt\u00a0…",
  "import.convertedFrom": "Auf diesem Gerät aus {format} umgewandelt",
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
  "music.hint": "Griffe ziehen oder mit den Pfeiltasten verschieben (Umschalt: 1 s).",
  "music.hintVolumeLine": "Die orange Linie zeigt die Lautstärke mit Ein- und Ausblende.",
  "music.details": "Details",
  "music.excerpt": "Ausschnitt",
  "music.wholeTrack": "Ganzer Song",
  "music.trimmed": "Ausschnitt",
  "music.wholeTrackHint": "Die Diashow nutzt den ganzen Song, {duration}.",
  "music.fadeIn": "Einblenden",
  "music.fadeOut": "Ausblenden",
  "music.fadeAutomatic": "Automatisch",
  "music.fadeOwn": "Gewählt",
  "music.fadeOff": "Aus",
  "music.fadeShort": "Kurz",
  "music.fadeLong": "Lang",
  "music.fadeNone": "–",
  "music.automaticBecause": "Automatisch: {reason}.",
  "music.reason-excerpt-starts-mid-track": "kurz, weil der Ausschnitt mitten im Song beginnt",
  "music.reason-track-starts": "aus, weil der Song von vorn beginnt",
  "music.reason-slideshow-ends": "lang, weil die Diashow bei {time} endet",
  "music.reason-excerpt-ends-early": "lang, weil der Ausschnitt vor dem Songende aufhört",
  "music.reason-track-ends": "aus, weil der Song von selbst endet",
  "music.pictureTimes": "Bilddauer",
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
  "music.noteFitted":
    "Jedes Bild ohne eigene Dauer schrumpft auf etwa {seconds}, um mit der Musik zu enden.",
  "music.noteFittedOnTheBeat":
    "Jedes Bild ohne eigene Dauer schrumpft auf etwa {seconds}, jeder Wechsel auf dem nächsten Takt, um mit der Musik zu enden.",
  "music.noteOwnSeconds":
    "Jedes Bild ohne eigene Dauer bleibt {seconds}. Die Diashow dauert {time}, die Musik blendet dort aus.",
  "music.noteOwnSecondsOnTheBeat":
    "Jedes Bild ohne eigene Dauer bleibt etwa {seconds}, jeder Wechsel auf dem nächsten Schlag. Die Diashow dauert {time}, die Musik blendet dort aus.",
  "music.noteOutlastsOwnSeconds":
    "Jedes Bild ohne eigene Dauer bleibt {seconds}; nach der Ausblende laufen die letzten Bilder still. Kürzere Bilder, längere Musik oder „Musik füllen“ beheben das.",
  "music.pictureLength": "Bilddauer",
  "music.aboutSecondsEach": "Je etwa {seconds}",
  "music.pictureLengthFitted": "Auf {seconds} gekürzt, damit es zur Musik passt",
  "music.fillTheMusic": "Musik füllen",
  "music.pictureTimesByMood": "Die Bilddauer wird durch die Stimmung {name} festgelegt — {value}",
  "music.setOwnPictureTimes": "Selbst festlegen",
  "music.pictureChanges": "Bildwechsel",
  "music.beatsPerMinute": "{bpm} Schläge pro Minute",
  "music.onTheBeat": "Im Takt",
  "music.evenly": "Gleichmäßig",
  "music.onTheBeatHint":
    "Jeder automatische Wechsel landet auf einem Schlag der Musik; ein Übergang dauert ganze Schläge.",
  "music.ownDurationsOffBeat": {
    one: "Bild {pictures} behält seine eigene Dauer genau: Danach folgt kein automatisches Bild, das den Versatz ausgleichen könnte, darum kann der Wechsel zwischen die Schläge fallen.",
    other:
      "Die Bilder {pictures} behalten ihre eigene Dauer genau: Danach folgt kein automatisches Bild, das den Versatz ausgleichen könnte, darum können die Wechsel zwischen die Schläge fallen.",
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
  "music.volumeLevelled": "Gleich laut wie die anderen Songs",
  "music.volumeOwn": "Gewählt",
  "music.volumeMeasuring": "Wird gemessen…",
  "music.volumeSubUnmeasured": "Spielt wie aufgenommen, bis gemessen",
  "music.volumeSubAsFarAsItGoes": "So laut wie möglich",
  "music.volumeSubSameLoudness": "Gleich laut wie die anderen Songs",
  "music.volumeSubLouder": "Lauter als die anderen Songs",
  "music.volumeSubQuieter": "Leiser als die anderen Songs",
  "music.volumeHintMeasuring": "Die Lautheit wird gemessen… bis dahin spielt er wie aufgenommen.",
  "music.volumeHintUndecodable":
    "Glissando konnte die Lautheit dieses Songs nicht heraushören; er spielt wie aufgenommen.",
  "music.volumeHintCappedShort":
    "{shortDb} dB leiser als die anderen Songs, damit es sauber klingt.",
  "music.volumeHintCappedMax": "So laut wie möglich.",
  "music.volumeHintLevelledBy": "Gleich laut wie die anderen Songs, angepasst um {levelDb}.",
  "music.volumeReset": "Zurück auf Automatisch",
  "music.volumeListen": "Anhören",
  "music.volumeListenStop": "Stopp",
  "music.volumeListenAt": "bei dieser Lautstärke, an der lautesten Stelle",
  "music.volumeListenOriginal": "Originaldatei, wie aufgenommen",
  "music.volumeOriginalFile": "Originaldatei",
  "music.volumeListenCompare":
    "Während des Anhörens auf einen anderen Song tippen, um zu vergleichen.",
} as const satisfies Record<string, Message>;
