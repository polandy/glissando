import type { ImmichPhoto, ImmichPhotoPage } from "./immich-client";
import type { ImmichJsonReader, JsonRecord } from "./immich-json";

export const IMAGE_ASSET_TYPE = "IMAGE";
const VIDEO_ASSET_TYPE = "VIDEO";
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
/** Immich writes a video's length as "H:MM:SS.ffffff". */
const DURATION_PATTERN = /^(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/;

/** The photos (and, when asked, videos) of one metadata-search answer, and the next page. */
export function readPhotoPage(
  reader: ImmichJsonReader,
  answer: unknown,
  withVideos: boolean,
): ImmichPhotoPage {
  const assets = reader.record(reader.record(answer, "a body").assets, '"assets"');
  const records = reader
    .array(assets.items, '"assets.items"')
    .map((value) => reader.record(value, "an asset"));
  const photos = records.flatMap((asset): ImmichPhoto[] => {
    const type = reader.optionalString(asset, "type");
    if (type === VIDEO_ASSET_TYPE && !withVideos) return [];
    if (type !== null && type !== IMAGE_ASSET_TYPE && type !== VIDEO_ASSET_TYPE) return [];
    const photo: ImmichPhoto = {
      id: reader.string(asset, "id"),
      fileName: reader.string(asset, "originalFileName"),
      takenAt: reader.wallTime(asset, "localDateTime"),
      size: photoSize(
        reader.optionalNumber(asset, "width"),
        reader.optionalNumber(asset, "height"),
      ),
      place: placeOf(reader, asset),
    };
    return [
      type === VIDEO_ASSET_TYPE
        ? {
            ...photo,
            video: { durationMs: durationMs(reader.optionalString(asset, "duration")) },
          }
        : photo,
    ];
  });
  return { photos, nextPage: reader.optionalCountingString(assets, "nextPage") };
}

function photoSize(width: number | null, height: number | null): ImmichPhoto["size"] {
  // Immich answers 0 for a size it could not read.
  return width === null || height === null || width <= 0 || height <= 0 ? null : { width, height };
}

/** The EXIF city; Immich leaves `exifInfo` or the city out for a picture it could not place. */
function placeOf(reader: ImmichJsonReader, asset: JsonRecord): string | null {
  if (asset.exifInfo === undefined || asset.exifInfo === null) return null;
  const city = reader.optionalString(reader.record(asset.exifInfo, '"exifInfo"'), "city");
  return city === "" ? null : city;
}

/** A video's length in ms; null where Immich has none (it answers "0:00:00.00000" then). */
function durationMs(text: string | null): number | null {
  const parts = text === null ? null : DURATION_PATTERN.exec(text);
  if (parts === null) return null;
  const [, hours, minutes, seconds] = parts;
  const total =
    Number(hours) * SECONDS_PER_HOUR + Number(minutes) * SECONDS_PER_MINUTE + Number(seconds);
  return total > 0 ? Math.round(total * MILLISECONDS_PER_SECOND) : null;
}
