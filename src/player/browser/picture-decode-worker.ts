// The worker side of `WorkerPictureDecoder`: decodes each picture into a bitmap and hands it
// over, so the main thread never waits for a decode (ADR-0014). Typed with the DOM lib, whose
// `self` covers what a dedicated worker uses here.
import type { DecodeReply, DecodeRequest } from "./worker-picture-decoder";

self.addEventListener("message", (event: MessageEvent<DecodeRequest>) => {
  void decode(event.data);
});

async function decode({ id, bytes }: DecodeRequest): Promise<void> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(bytes, { imageOrientation: "from-image" });
  } catch (error) {
    const reply: DecodeReply = {
      id,
      kind: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
    return;
  }
  const reply: DecodeReply = { id, kind: "decoded", bitmap };
  self.postMessage(reply, { transfer: [bitmap] });
}
