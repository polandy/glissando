import type { RequestBody } from "./library-http";

/**
 * A request's body, at most `limit` bytes. Past the limit the rest is read and dropped rather
 * than the stream left unread, because abandoning a request stream closes its socket before
 * the 413 is sent. `declaredLength` is the Content-Length header; one over the limit is refused
 * before anything is read.
 */
export async function collectBody(
  chunks: AsyncIterable<Uint8Array>,
  limit: number,
  declaredLength: string | undefined,
): Promise<RequestBody> {
  if (declaredLength !== undefined && Number(declaredLength) > limit) {
    return { kind: "tooLarge" };
  }
  const kept: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of chunks) {
    length += chunk.byteLength;
    if (length <= limit) {
      kept.push(chunk);
    }
  }
  if (length > limit) {
    return { kind: "tooLarge" };
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of kept) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { kind: "received", bytes };
}
