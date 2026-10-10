import type { Catalogue } from "./messages";
import type { deVideo } from "./catalogue-de-video";

/** English copy of the video export; typed to the German keys. */
export const enVideo: Pick<Catalogue, keyof typeof deVideo> = {
  "slideshow.saveAsVideo": "Save as video",
  "videoExport.title": "Save as video",
  "videoExport.subtitle": "{title} · {duration} · {music}",
  "videoExport.withMusic": "with music",
  "videoExport.withoutMusic": "without music",
  "videoExport.probing": "Glissando is checking what this device can do …",
  "videoExport.sizes": "Size",
  "videoExport.preset-720p": "Small",
  "videoExport.preset-1080p": "Standard",
  "videoExport.preset-4k": "Large",
  "videoExport.use-720p": "For sending",
  "videoExport.use-1080p": "For computer, phone and tablet",
  "videoExport.use-4k": "For the TV",
  "videoExport.resolution": "{width} × {height}",
  "videoExport.about": "about {size}",
  "videoExport.cannotEncode": "This device cannot encode it",
  "videoExport.container": "MP4",
  "videoExport.videoCodec": "H.264",
  "videoExport.audio-aac": "AAC",
  "videoExport.audio-opus": "Opus",
  "videoExport.frameRate": "{fps} fps",
  "videoExport.opusTitle": "The sound will be Opus.",
  "videoExport.opusText":
    "This browser cannot encode AAC. The video plays on computers, in VLC and on Android, but not on iPhone, iPad and Apple TV. For Apple devices, save it in Safari, or in Chrome on Windows or macOS.",
  "videoExport.spaceTitle": "There is probably not enough space.",
  "videoExport.spaceText": "About {free} is free, “{preset}” needs about {needed}.",
  "videoExport.spaceFits": "“{preset}” fits.",
  "videoExport.hint":
    "Glissando renders every frame one by one, which takes about as long as the slideshow, depending on the device. Keep Glissando open meanwhile; the screen stays on.",
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
  "videoExport.storageFullTitle": "The device's storage is full.",
  "videoExport.storageFullText":
    "At frame {frame} of {total} there was no space left. The unfinished file is deleted. About {missing} is missing; “Small”, or tidying up the device, will do.",
  "videoExport.otherSize": "Choose another size",
  "videoExport.failedText":
    "Something went wrong while creating it. The unfinished file is discarded.",
  "videoExport.unsupportedTitle": "This browser cannot create videos.",
  "videoExport.unsupportedText":
    "Glissando needs WebCodecs for it. Current Chrome, Edge, Firefox and Safari (also on iPhone and iPad) have it.",
};
