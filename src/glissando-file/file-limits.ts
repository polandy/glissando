import { MAX_VIDEO_BYTES } from "../library/own-video";
import { MAX_32_BIT } from "./stored-zip";

/**
 * Size limits a .glissando file's entries are checked against before any media bytes are read
 * (ADR-0038): bounding each kind of entry, and the container as a whole, against a ZIP bomb.
 */

const KiB = 1024;
const MiB = KiB * 1024;

/** `glissando.json` itself: generous for a long slideshow's settings, nowhere near its media. */
export const MAX_MANIFEST_BYTES = 8 * MiB;
/** A display picture, at the 4K display bound. */
export const MAX_DISPLAY_PICTURE_BYTES = 64 * MiB;
/** A thumbnail, far smaller than its display picture. */
export const MAX_THUMBNAIL_BYTES = 4 * MiB;
/** A clip, the same bound a device import keeps a clip to. */
export const MAX_CLIP_BYTES = MAX_VIDEO_BYTES;
/** The sum of every entry's size: what a stored ZIP with no ZIP64 can hold, 4 GiB − 1. */
export const MAX_TOTAL_ENTRY_BYTES = MAX_32_BIT;
