// Base64 for the exported page's media blocks; free of imports, so the build and the page's
// script can use it as well.

/** A multiple of 3, so every chunk but the last encodes without padding. */
const BASE64_CHUNK_BYTES = 3 * 0x2000;

export function encodeBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK_BYTES) {
    const chunk = bytes.subarray(start, start + BASE64_CHUNK_BYTES);
    chunks.push(btoa(String.fromCharCode(...chunk)));
  }
  return chunks.join("");
}

export function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
