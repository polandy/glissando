import type { RequestBody } from "./library-http";

/** How many bytes past the limit are still read and dropped so the 413 reaches the client. */
export const DRAIN_BUDGET_BYTES = 1024 * 1024;

/**
 * The body as received, too large but read to its end, or too large and left unread once the
 * drain budget ran out — the caller then closes the connection itself after its answer.
 */
export type CollectedBody = RequestBody | { readonly kind: "tooLargeUnread" };

/**
 * A request's body, at most `limit` bytes. Past the limit the rest is read and dropped rather
 * than the stream left unread, because a socket closed with unread bytes resets the connection
 * and the client may lose the 413 — so a body somewhat over the limit is still read to its end.
 * The draining stops `DRAIN_BUDGET_BYTES` past the limit so an endless body cannot hold the
 * service; the time a slow body may take is bounded by the server's request timeout. The stream
 * is never closed here: returning from its iterator destroys the socket before the 413 is sent.
 */
export async function collectBody(
  chunks: AsyncIterable<Uint8Array>,
  limit: number,
): Promise<CollectedBody> {
  const reading = chunks[Symbol.asyncIterator]();
  const kept: Uint8Array[] = [];
  let length = 0;
  for (let next = await reading.next(); next.done !== true; next = await reading.next()) {
    length += next.value.byteLength;
    if (length <= limit) {
      kept.push(next.value);
    } else if (length > limit + DRAIN_BUDGET_BYTES) {
      return { kind: "tooLargeUnread" };
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
