//#region ../../../../../home/andy/dev/glissando/src/import/testing/synthetic-jpeg.ts
const TAG_EXIF_IFD_POINTER = 34665;
const TAG_DATE_TIME_ORIGINAL = 36867;
const TAG_EXPOSURE_TIME = 33434;
const TYPE_ASCII = 2;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;
const IFD0_OFFSET = 8;
const DATE_OFFSET = 44;
function syntheticJpeg(options) {
  const little = options.byteOrder === "little";
  const tiff = [];
  const u16 = (value) =>
    tiff.push(...(little ? [value & 255, value >> 8] : [value >> 8, value & 255]));
  const u32 = (value) => {
    const bytes = [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255];
    tiff.push(...(little ? bytes.reverse() : bytes));
  };
  const entry = (tag, type, count, value) => {
    u16(tag);
    u16(type);
    u32(count);
    u32(value);
  };
  tiff.push(...(little ? [73, 73] : [77, 77]));
  u16(42);
  u32(IFD0_OFFSET);
  u16(1);
  entry(TAG_EXIF_IFD_POINTER, TYPE_LONG, 1, 26);
  u32(0);
  u16(1);
  const date = options.dateTimeOriginal;
  if (date === null) entry(TAG_EXPOSURE_TIME, TYPE_RATIONAL, 1, DATE_OFFSET);
  else entry(TAG_DATE_TIME_ORIGINAL, TYPE_ASCII, date.length + 1, DATE_OFFSET);
  u32(0);
  tiff.push(...ascii(date ?? "\0\0\0\0\0\0\0\0"), 0);
  const app0 = options.withApp0
    ? [255, 224, 0, 16, ...ascii("JFIF"), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]
    : [];
  const exif = [...ascii("Exif"), 0, 0, ...tiff];
  const app1Length = exif.length + 2;
  const header = [255, 216, ...app0, 255, 225, app1Length >> 8, app1Length & 255];
  const tiffStart = header.length + 6;
  const bytes = [...header, ...exif, 255, 218, 0, 2, 255, 217];
  return {
    bytes: Uint8Array.from(bytes),
    tiffStart,
    dateEnd: tiffStart + DATE_OFFSET + (date?.length ?? 0),
  };
}
function ascii(text) {
  return [...text].map((character) => character.charCodeAt(0));
}
//#endregion
export { syntheticJpeg };
