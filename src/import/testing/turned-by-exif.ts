/**
 * An APP1 segment whose EXIF says "rotate 90° clockwise to view" (Orientation 6): big-endian
 * TIFF header, one IFD with the single Orientation tag.
 */
// prettier-ignore
const EXIF_ORIENTATION_6 = new Uint8Array([
  0xff, 0xe1, 0x00, 0x22,
  0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
  0x00, 0x01,
  0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, 0x06, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00,
]);
const JPEG_START_OF_IMAGE = 0xffd8;
const JFIF_MARKER = 0xffe0;
const MARKER_BYTES = 2;

/** Where the EXIF segment goes: after the start of image and the JFIF segment, if there is one. */
function exifOffset(jpegBytes: Uint8Array): number {
  const view = new DataView(jpegBytes.buffer, jpegBytes.byteOffset, jpegBytes.byteLength);
  if (view.getUint16(0) !== JPEG_START_OF_IMAGE) {
    throw new Error("the test picture is no JPEG");
  }
  return view.getUint16(MARKER_BYTES) === JFIF_MARKER
    ? MARKER_BYTES + MARKER_BYTES + view.getUint16(MARKER_BYTES + MARKER_BYTES)
    : MARKER_BYTES;
}

/** `picture` (a JPEG) with an EXIF orientation of 6, so a viewer shows it turned a quarter. */
export async function turnedByExif(picture: Blob): Promise<Blob> {
  const bytes = new Uint8Array(await picture.arrayBuffer());
  const offset = exifOffset(bytes);
  return new Blob([bytes.subarray(0, offset), EXIF_ORIENTATION_6, bytes.subarray(offset)], {
    type: "image/jpeg",
  });
}
