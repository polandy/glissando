import type { deHtml } from "./catalogue-de-html.ts";
import type { Catalogue } from "./messages.ts";

/** English copy of the web page export; typed to the German keys. */
export const enHtml: Pick<Catalogue, keyof typeof deHtml> = {
  "htmlExport.title": "Web page",
  "htmlExport.subtitle": "{title} · {duration} · {music}",
  "htmlExport.withMusic": "with music",
  "htmlExport.withoutMusic": "without music",
  "htmlExport.sizes": "Picture size",
  "htmlExport.use-small": "For sending in a message",
  "htmlExport.use-sharp": "Full HD, for a computer or tablet",
  "htmlExport.use-4k": "4K, for the TV",
  "htmlExport.sizeLine": "{pixels} px · {use}",
  "htmlExport.about": "about {size}",
  "htmlExport.compare": "Size compared with the video",
  "htmlExport.compareWebPage": "Web page",
  "htmlExport.compareVideo": "Video 1080p",
  "htmlExport.bigTitle": "Too big to send as mail.",
  "htmlExport.bigText":
    "Copy it to the TV's computer or a USB stick, or share it through a cloud folder.",
  "htmlExport.hint":
    "Plays in any browser, offline. Pictures are downscaled; the originals stay here.",
  "htmlExport.clipsNote": {
    one: "The clip goes in whole, so the size barely changes with the picture size.",
    other: "The {count} clips go in whole, so the size barely changes with the picture size.",
  },
  "htmlExport.start": "Create web page",
  "htmlExport.runningTitle": "Creating the web page",
  "htmlExport.runningSubtitle": "{size} · {pixels} px",
  "htmlExport.pictures": "Picture {done} of {total}",
  "htmlExport.doneTitle": "The web page is ready",
  "htmlExport.fileFacts": "{size} · {duration} · {pixels} px",
  "htmlExport.savedTitle": "Saved",
  "htmlExport.savedText": "where you chose when starting.",
  "htmlExport.finish": "Done",
  "htmlExport.open": "Open it",
  "htmlExport.share": "Share …",
  "htmlExport.shareHint":
    "“Share …” opens the share menu: Mail, Messages, AirDrop, Files. Closing deletes the copy in Glissando.",
  "htmlExport.download": "Download",
  "htmlExport.downloadHint": "Closing deletes the copy in Glissando; download it first.",
  "htmlExport.failedTitle": "Web page not created",
  "htmlPage.eyebrow": "Slideshow",
  "htmlPage.summary": "{pictures} · {duration} · {music}",
  "htmlPage.madeWith": "Made with Glissando · plays offline",
  "htmlPage.play": "Play",
  "htmlPage.pause": "Pause",
  "htmlPage.mute": "Mute",
  "htmlPage.unmute": "Unmute",
  "htmlPage.fullScreen": "Full screen",
  "htmlPage.timeline": "Timeline",
  "htmlPage.playAgain": "Play again",
  "htmlPage.cannotPlay": "This slideshow cannot play here.",
  "htmlPage.noscript":
    "This slideshow needs JavaScript. Open the file in a browser such as Safari, Chrome or Firefox.",
};
