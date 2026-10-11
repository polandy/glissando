# Renderers

- **WebGL2** (default): one shader program per transition, compiled up front;
  `ShaderCompileError` carries the driver's log. The canvas follows its CSS size times the
  device pixel ratio, or keeps a fixed `drawingSize` (the video export's, with pixel ratio 1).
  Its pictures are `ImageBitmap`s decoded in a worker (`BitmapLoader`,
  `WorkerPictureDecoder`, which rejects every decode once its worker could not start, crashed or
  was disposed), upright by their EXIF orientation; a released picture's bitmap is
  closed. Each becomes a mipmapped texture (`picture-textures.ts`), uploaded by `prepare` in
  steps: the storage for the whole mip chain with a first slice of rows, one slice of at most
  `UPLOAD_PIXELS_PER_FRAME` pixels per call, the mipmaps in a call of their own, then the
  caption. Drawing a picture not fully prepared (after a seek) uploads the rest at once
  (ADR-0014).
- **Captions in WebGL**: once the caption font has loaded (`document.fonts.load`, an injected port;
  until then slides draw without captions, then a redraw follows), each loaded slide with a caption
  gets its band, gradient and text, drawn with Canvas 2D at drawing-buffer resolution into a
  premultiplied texture (`caption-textures.ts`), keyed on and released with the slide's picture,
  prepared ahead like the picture, and drawn anew when the viewport, the pixel ratio (browser zoom)
  or the caption changes, and after a restored WebGL context. The transition shaders composite each
  slide's band over its picture in screen space inside `fromColor`/`toColor`, so every effect
  carries it; `captionInset` is a uniform shifting where the band is sampled, so it never redraws
  the texture. A slide without a caption samples a transparent 1×1 texture.
- **Context loss**: on `webglcontextlost` it stops issuing GL calls (`render()` is a no-op, never
  throwing) until `webglcontextrestored`, when it rebuilds its buffers and shader programs, drops
  its texture cache (textures are uploaded anew from the still-held bitmaps when each picture is
  next prepared or drawn), and triggers a redraw of the current frame.
- **DOM fallback** when the browser has no WebGL2: pictures load as `<img>` elements decoded by the
  browser (`ImageElementLoader`), and `prepare` does nothing. Each slide is its `<img>`, framed by a
  CSS transform, followed by its caption element (`[data-caption]`, styled by `captionStyles`)
  outside that transform; every transition becomes a crossfade, the caption fading with its slide.
  Two lines are clamped with CSS.
