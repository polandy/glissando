// The worker side of `WorkerPictureDecoder`: decodes each picture into its RGBA bytes and hands
// them over, so the main thread never waits for a decode (ADR-0014). Typed with the DOM lib, whose
// `self` covers what a dedicated worker uses here.
import { pixelsOf } from "./bitmap-pixels";
import type { DecodeReply, DecodeRequest } from "./worker-picture-decoder";

self.addEventListener("message", (event: MessageEvent<DecodeRequest>) => {
  void decode(event.data);
});

async function decode({ id, bytes }: DecodeRequest): Promise<void> {
  let reply: DecodeReply;
  try {
    const picture = pixelsOf(await createImageBitmap(bytes, { imageOrientation: "from-image" }));
    reply = { id, kind: "decoded", picture };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id, kind: "failed", message } satisfies DecodeReply);
    return;
  }
  self.postMessage(reply, { transfer: [reply.picture.data.buffer] });
}
