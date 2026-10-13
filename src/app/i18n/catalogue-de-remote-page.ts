import type { Message } from "./messages.ts";

/**
 * German copy of the phone's remote for a slideshow on the TV (dev-docs/tv_remote/REMOTE_PAGE.md),
 * built into that page with the export page's play words.
 */
export const deRemotePage = {
  "remotePage.showing": "Läuft auf dem Fernseher",
  "remotePage.connecting": "Verbinde …",
  "remotePage.reconnecting": "Verbinde neu …",
  "remotePage.tvAway": "Der Fernseher ist nicht da",
  "remotePage.tvAwayNote":
    "Der Fernseher hat seine Seite geschlossen. Öffne sie dort wieder, dann geht es weiter.",
  "remotePage.needsTvOkNote":
    "Drück einmal OK auf der Fernbedienung des Fernsehers, um den Ton zu erlauben.",
  "remotePage.waiting": "Warte, bis der Fernseher eine Diashow zeigt …",
  "remotePage.pictureOf": "Bild {number} von {count}",
  "remotePage.playing": "Läuft",
  "remotePage.paused": "Pausiert",
  "remotePage.finished": "Zu Ende",
  "remotePage.previous": "Vorheriges Bild",
  "remotePage.next": "Nächstes Bild",
  "remotePage.position": "Stelle in der Diashow",
  "remotePage.volume": "Lautstärke der Musik",
  "remotePage.startOver": "Von vorn",
  "remotePage.disconnect": "Trennen",
  "remotePage.commandFailed": "Das ist nicht beim Fernseher angekommen.",
  "remotePage.endedTitle": "Diese Fernbedienung ist beendet",
  "remotePage.endedText":
    "Der Fernseher wurde getrennt oder hat seine Seite geschlossen. Um wieder etwas zu zeigen, fang am Fernseher neu an.",
  "remotePage.noscript":
    "Diese Fernbedienung braucht JavaScript. Öffne sie in einem Browser wie Safari, Chrome oder Firefox.",
} as const satisfies Record<string, Message>;
