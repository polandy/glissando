import type { Catalogue } from "./messages.ts";
import type { deVideo } from "./catalogue-de-video.ts";

/** English copy of the video export; typed to the German keys. */
export const enVideo: Pick<Catalogue, keyof typeof deVideo> = {
  "videoExport.title": "Video",
  "videoExport.subtitle": "{title} · {duration} · {music}",
  "videoExport.withMusic": "with music",
  "videoExport.withoutMusic": "without music",
  "videoExport.probing": "Glissando is checking what this device can do …",
  "videoExport.sizes": "Size",
  "videoExport.use-720p": "For sending",
  "videoExport.use-1080p": "Full HD, for computer, phone and tablet",
  "videoExport.use-4k": "4K, for the TV",
  "videoExport.resolution": "{width} × {height}",
  "videoExport.sizeLine": "{resolution} · {use}",
  "videoExport.about": "about {size}",
  "videoExport.cannotEncode": "This device cannot encode it",
  "videoExport.spaceTitle": "There is probably not enough space.",
  "videoExport.spaceText": "About {free} is free, “{preset}” needs about {needed}.",
  "videoExport.spaceFits": "“{preset}” fits.",
  "videoExport.appleNote":
    "Won't play on iPhone, iPad or Apple TV from this browser. For those, create it in Safari.",
  "videoExport.hint": "Takes about as long as the slideshow. Keep Glissando open.",
  "videoExport.start": "Create video",
  "videoExport.runningTitle": "Creating the video",
  "videoExport.runningSubtitle": "{preset} · {resolution}",
  "videoExport.position": "{at} / {total}",
  "videoExport.frames": "Frame {done} of {total}",
  "videoExport.remaining": "about {time} left",
  "videoExport.runningHint":
    "You can switch apps: the rendering pauses and carries on when you come back.",
  "videoExport.doneTitle": "The video is ready",
  "videoExport.fileFacts": "{size} · {duration} · {resolution}",
  "videoExport.savedTitle": "Saved",
  "videoExport.savedText": "where you chose when starting.",
  "videoExport.finish": "Done",
  "videoExport.share": "Share …",
  "videoExport.shareHint":
    "“Share …” opens the share menu: “Save Video” puts it in Photos, and there are Files, AirDrop and Messages. Closing deletes the copy in Glissando.",
  "videoExport.download": "Download",
  "videoExport.downloadHint": "Closing deletes the copy in Glissando; download it first.",
  "videoExport.failedTitle": "Video not created",
};
