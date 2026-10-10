import {
  GLISSANDO_FORMAT_ID,
  GLISSANDO_FORMAT_VERSION,
  MANIFEST_ENTRY_NAME,
  OLDEST_READABLE_FORMAT_VERSION,
  ORIGIN_FROM_VERSION,
  type GlissandoManifest,
  type ManifestMusic,
  type ManifestPicture,
  type ManifestReading,
} from "./glissando-manifest";
import {
  DocumentFormatError,
  isObject,
  readObject,
  readPositiveInteger,
  readText,
  type JsonObject,
} from "./document-values";
import {
  musicKeys,
  pictureKeys,
  readMusicFields,
  readPictureFields,
  readPictures,
  readSlideshowFields,
  slideshowKeys,
} from "./slideshow-fields";

/** Untrusted manifest text: foreign, from a newer version, damaged or a valid manifest. */
export function readManifest(text: string): ManifestReading {
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: "damaged", reason: `glissando.json is no JSON: ${error.message}` };
    }
    throw error;
  }
  if (!isObject(input) || input["format"] !== GLISSANDO_FORMAT_ID) {
    return { kind: "foreign" };
  }
  const version = input["formatVersion"];
  if (
    typeof version === "number" &&
    Number.isInteger(version) &&
    version > GLISSANDO_FORMAT_VERSION
  ) {
    return { kind: "newer" };
  }
  try {
    return { kind: "ok", manifest: readValidManifest(input) };
  } catch (error) {
    if (error instanceof DocumentFormatError) {
      return { kind: "damaged", reason: `${MANIFEST_ENTRY_NAME} ${error.message}` };
    }
    throw error;
  }
}

function readValidManifest(input: JsonObject): GlissandoManifest {
  const root = readObject(input, "", ["format", "formatVersion", "slideshow"]);
  const version = root["formatVersion"];
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < OLDEST_READABLE_FORMAT_VERSION
  ) {
    throw new DocumentFormatError(
      "formatVersion",
      `a whole number from ${OLDEST_READABLE_FORMAT_VERSION} to ${GLISSANDO_FORMAT_VERSION}`,
      version,
    );
  }
  const path = "slideshow";
  const show = readObject(root["slideshow"], path, slideshowKeys(version));
  return {
    format: GLISSANDO_FORMAT_ID,
    formatVersion: version,
    slideshow: {
      ...readSlideshowFields(show, path),
      pictures: readPictures(show, path, (picture, picturePath) =>
        readPicture(picture, picturePath, version),
      ),
      ...(show["music"] === undefined
        ? {}
        : { music: readMusic(show["music"], `${path}.music`, version) }),
    },
  };
}

function readPicture(value: unknown, path: string, version: number): ManifestPicture {
  const picture = readObject(value, path, [
    "file",
    "thumbnail",
    ...pictureKeys(version),
    ...(version >= ORIGIN_FROM_VERSION ? ["immichAssetId", "fileBytes"] : []),
  ]);
  const { immichAssetId, fileBytes } = picture;
  if (immichAssetId !== undefined && fileBytes !== undefined) {
    const both = { immichAssetId, fileBytes };
    throw new DocumentFormatError(path, "immichAssetId or fileBytes, not both", both);
  }
  return {
    file: readText(picture["file"], `${path}.file`),
    thumbnail: readText(picture["thumbnail"], `${path}.thumbnail`),
    ...readPictureFields(picture, path),
    ...(immichAssetId === undefined
      ? {}
      : { immichAssetId: readText(immichAssetId, `${path}.immichAssetId`) }),
    ...(fileBytes === undefined
      ? {}
      : { fileBytes: readPositiveInteger(fileBytes, `${path}.fileBytes`) }),
  };
}

function readMusic(value: unknown, path: string, version: number): ManifestMusic {
  const music = readObject(value, path, ["file", ...musicKeys(version)]);
  return { file: readText(music["file"], `${path}.file`), ...readMusicFields(music, path) };
}
