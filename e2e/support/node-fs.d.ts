/**
 * The parts of Node's fs and zlib the cases use to read a shared test picture or a downloaded
 * file, or to compress a fixture picture's pixels. The project's types describe the browser only,
 * so the cases declare what they use rather than pull in all of Node's types.
 */
declare module "node:fs" {
  export function readFileSync(path: URL | string): Uint8Array;
}

declare module "node:zlib" {
  export function deflateSync(data: Uint8Array): Uint8Array<ArrayBuffer>;
}
