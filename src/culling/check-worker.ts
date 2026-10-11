// The worker side of `WorkerPictureChecker`: decodes each thumbnail and measures it for culling,
// off the main thread (ADR-0024). Typed with the DOM lib, whose `self` covers what a dedicated
// worker uses here.
import { greyFromRgba, type GreyImage } from "../focus/grey-image";
import type { CheckReply, CheckRequest } from "./check-worker-protocol";
import { measurePicture } from "./measure-picture";

self.addEventListener("message", (event: MessageEvent<CheckRequest>) => {
  void answer(event.data).then((reply) => self.postMessage(reply));
});

async function answer({ id, thumbnail }: CheckRequest): Promise<CheckReply> {
  try {
    return { id, kind: "measured", measure: measurePicture(await greyOf(thumbnail)) };
  } catch (error) {
    return { id, kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
}

async function greyOf(thumbnail: Blob): Promise<GreyImage> {
  const bitmap = await createImageBitmap(thumbnail);
  try {
    const { width, height } = bitmap;
    const context = new OffscreenCanvas(width, height).getContext("2d");
    if (!context) throw new Error("The check worker has no 2D canvas to decode thumbnails in");
    context.drawImage(bitmap, 0, 0);
    return greyFromRgba(context.getImageData(0, 0, width, height).data, width, height);
  } finally {
    bitmap.close();
  }
}
