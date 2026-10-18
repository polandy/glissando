/**
 * The parts of Node's fs, fs/promises, path and zlib the cases use to read a shared test picture
 * or a downloaded file, unpack a .glissando file onto disk, or compress a fixture picture's
 * pixels. The project's types describe the browser only, so the cases declare what they use
 * rather than pull in all of Node's types.
 */
declare module "node:fs" {
  export function readFileSync(path: URL | string): Uint8Array<ArrayBuffer>;
}

declare module "node:fs/promises" {
  export function mkdir(path: string, options: { recursive: true }): Promise<string | undefined>;
  export function writeFile(path: string, data: Uint8Array): Promise<void>;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
}

declare module "node:zlib" {
  export function deflateSync(data: Uint8Array): Uint8Array<ArrayBuffer>;
}
