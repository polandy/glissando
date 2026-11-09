import type { RandomBytes } from "../share-token";

/** No I, L or O, which a TV's font shows like 1 and 0. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;
/** Far more than a hub of MAX_SESSIONS codes among 23^4 ever needs. */
const MAX_CODE_DRAWS = 64;
/** A byte from here up is drawn again, so that every letter is equally likely. */
const UNBIASED_BYTE_LIMIT = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;

/** A code not `taken` yet, drawn without bias from `randomBytes`. */
export function drawCode(randomBytes: RandomBytes, taken: (code: string) => boolean): string {
  for (let draw = 0; draw < MAX_CODE_DRAWS; draw++) {
    const bytes = randomBytes(CODE_LENGTH);
    if (bytes.length !== CODE_LENGTH) {
      throw new Error(`the random source answered ${bytes.length} bytes, not ${CODE_LENGTH}`);
    }
    if (bytes.some((byte) => byte >= UNBIASED_BYTE_LIMIT)) continue;
    const code = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
    if (!taken(code)) return code;
  }
  throw new Error(`no unused code after ${MAX_CODE_DRAWS} draws from the random source`);
}
