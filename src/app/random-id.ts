const ID_BYTES = 16;
const HEX = 16;

/**
 * A random id. `getRandomValues` rather than `randomUUID`, which browsers offer in secure
 * contexts only, and the app is also served over plain HTTP on the local network.
 */
export function randomId(random: Pick<Crypto, "getRandomValues">): string {
  const bytes = random.getRandomValues(new Uint8Array(ID_BYTES));
  return [...bytes].map((byte) => byte.toString(HEX).padStart(2, "0")).join("");
}
