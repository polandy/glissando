/**
 * The part of Node's fs the cases use to read a shared test picture. The project's types describe
 * the browser only, so the cases declare what they use rather than pull in all of Node's types.
 */
declare module "node:fs" {
  export function readFileSync(path: URL): Uint8Array;
}
