# ADR-0036: Objects, animals among them, are found by YOLOX-nano, run by a small own ONNX interpreter

**Status:** accepted

## Context

ADR-0012 aims the automatic Ken Burns motion at faces; a picture of a dog, a horse or a bird has
none, so it plays today's middle-of-the-picture motion. Animals need an object detector. The
constraints of ADR-0012 stand: in the browser, offline, every asset shipped by the app
(ADR-0005), nothing sent to a third party, never holding up playing.

## Decision

- **YOLOX-nano** (Megvii-BaseDetection/YOLOX, Apache-2.0), the upstream `yolox_nano.onnx` of
  release 0.1.1rc0 byte for byte as `src/focus/yolox-nano.bin` (3.7 MB, 3.4 MB gzip), pinned by
  sha256 in a unit test. 80 COCO classes; every one counts as a subject (a person without a
  visible face, an animal, a vehicle, a cup), a score (objectness × class) of at least 0.35,
  non-maximum suppression at 0.45.
- **Run by ~600 lines of TypeScript** (`src/focus/onnx/`): a protobuf reader for the ONNX graph
  and the ten operators this network uses (Conv, MaxPool, Resize, Slice, Concat, Reshape,
  Transpose, Add, Mul, Sigmoid) on float32. An unknown operator fails loud.
- **Same pass, same worker, same store.** The focus worker looks for faces first; only a picture
  without a face is handed to the object network, the costlier of the two. The result is a
  `{kind: "subject"}` box like a face's, so the stored form, the motion (ADR-0006, ADR-0029)
  and the editors' focus mark need no change. Several objects of similar size are framed
  together, as faces are (ADR-0029); otherwise the largest, weighted by score, wins. A picture
  with a face aims at the face.
- **Where** the 416 px network is fed the stored 480 px thumbnail, scaled down and padded to a
  square (grey 114), as upstream's demo does.

## Options weighed

- _onnxruntime-web_ — fast (SIMD WASM) and maintained, but its WASM build is 14 MB (3.7 MB gzip,
  2.3 MB brotli) on top of the model: ~18 MB in the offline cache against 0.2 MB for the whole
  face detection, to run one 1 GFLOP network.
- _TensorFlow.js with COCO-SSD_ — the SSDLite MobileNet v2 weights alone are 18 MB.
- _MediaPipe object detector_ — rejected like its face detector in ADR-0012: two WASM builds
  and usage metrics posted to Google.
- _A bigger YOLO_ — Ultralytics' models are AGPL-3.0; YOLOX-nano is the smallest permissively
  licensed one that still finds cats and dogs reliably.
- _Landscape detection_ is a separate decision (a scene label, not a box): ADR-0037.

## Consequences

- The cost is time, not download: in Chromium (CI image, CPU at 1×) a picture takes 1.2–1.7 s
  including the face search, so ≈ 5–7 s on a mid-range phone (4×). The pass is one picture at a
  time in a worker and never blocks playing; pictures with a face skip the network.
- The model adds 3.7 MB to the offline cache (one file, no runtime).
- An interpreter of our own is ours to keep right: unit tests cover each operator, and the whole
  network is checked on a picture of a cat (CC0, scikit-image's `chelsea`), whose box was
  compared with onnxruntime's output while writing it.
- A different network later needs only the operators it uses added to `tensor-ops.ts`; if the
  time per picture matters more than the download, onnxruntime-web can replace the runner
  behind `objectFocus` without touching anything else.
- There is no migration: pictures stored without a focus are looked at, pictures already stored
  as "none" stay so until the focus store is cleared.
