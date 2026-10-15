// The worker side of `WorkerPictureDecoder`: decodes each picture into a bitmap and hands it
// over, so the main thread never waits for a decode (ADR-0014). Typed with the DOM lib, whose
// `self` covers what a dedicated worker uses here.
import type { DecodeReply, DecodeRequest } from "./worker-picture-decoder";

self.addEventListener("message", (event: MessageEvent<DecodeRequest>) => {
  void decode(event.data);
});

async function decode({ id, bytes }: DecodeRequest): Promise<void> {
  let owned: ImageBitmap;
  try {
    owned = ownedCopy(await createImageBitmap(bytes, { imageOrientation: "from-image" }));
  } catch (error) {
    const reply: DecodeReply = {
      id,
      kind: "failed",
      message: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(reply);
    return;
  }
  const reply: DecodeReply = { id, kind: "decoded", bitmap: owned };
  self.postMessage(reply, { transfer: [owned] });
}

// WebKit hands concurrent decodes of equally sized pictures each other's bitmaps; a copy drawn
// onto a canvas is the picture's own.
function ownedCopy(bitmap: ImageBitmap): ImageBitmap {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to copy a decoded picture");
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvas.transferToImageBitmap();
}
