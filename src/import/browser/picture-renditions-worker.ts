// The worker side of `WorkerPictureRenditions`: makes each picture's stored renditions off the
// main thread. Typed with the DOM lib, whose `self` covers what a dedicated worker uses here.
import { decodePicture } from "../downscale";
import { UnreadablePictureError } from "../unreadable-picture";
import type { RenditionsReply, RenditionsRequest } from "./worker-picture-renditions";

self.addEventListener("message", (event: MessageEvent<RenditionsRequest>) => {
  void renditions(event.data);
});

async function renditions({ id, file }: RenditionsRequest): Promise<void> {
  let reply: RenditionsReply;
  try {
    reply = { id, kind: "decoded", picture: await decodePicture(file) };
  } catch (error) {
    reply =
      error instanceof UnreadablePictureError
        ? { id, kind: "unreadable", stage: error.stage }
        : { id, kind: "failed", message: error instanceof Error ? error.message : String(error) };
  }
  self.postMessage(reply);
}
