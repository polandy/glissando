# Renderers

- **WebGL2** (default): one shader program per transition, compiled up front;
  `ShaderCompileError` carries the driver's log. The canvas follows its CSS size times the
  device pixel ratio, or keeps a fixed `drawingSize` (the video export's, with pixel ratio 1).
  Its pictures are `ImageBitmap`s decoded in a worker (`BitmapLoader`,
  `WorkerPictureDecoder`, which rejects every decode once its worker could not start, crashed or
  was disposed), upright by their EXIF orientation; a released picture's bitmap is
  closed. Each becomes a mipmapped texture (`picture-textures.ts`), uploaded by `prepare` in
  steps: the storage for the whole mip chain with a first slice of rows, one slice of at most
  `UPLOAD_PIXELS_PER_FRAME` pixels per call, the mipmaps in a call of their own, the blurred
  fill's small backdrop texture in another, then the caption. Drawing a picture not fully prepared (after a seek) uploads the rest at once
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
- **Title cards**: a card's items are laid out and measured once per `Card` and stage size
  (`CardItemLayouts`, a `WeakMap` keyed on the card), shared by both renderers rather than each
  measuring its own on every frame drawn. In WebGL, a card's texture is prepared ahead like a
  picture's, and so is its blurred copy for an entrance that may cross-fade from one (`focus`),
  so neither rasterises on the frame that first draws the card.
- **Context loss**: on `webglcontextlost` it stops issuing GL calls (`render()` is a no-op, never
  throwing) until `webglcontextrestored`, when it rebuilds its buffers and shader programs, drops
  its texture cache (textures are uploaded anew from the still-held bitmaps when each picture is
  next prepared or drawn), and triggers a redraw of the current frame.
- **DOM fallback** when the browser has no WebGL2: pictures load as `<img>` elements decoded by the
  browser (`ImageElementLoader`), and `prepare` does nothing. Each slide is its `<img>`, framed by a
  CSS transform, followed by its caption element (`[data-caption]`, styled by `captionStyles`)
  outside that transform; every transition becomes a crossfade, the caption fading with its slide.
  Two lines are clamped with CSS.
- **Video slides (ADR-0035)**: a picture layer carries `live`, the clip's current frame
  (`PictureSlideLayer.live`), while its poster still sets the layout and the blurred fill's
  backdrop; both renderers draw it under the picture's crop, fit, caption and card rules.
  - **WebGL**: `PictureTextures.live` re-uploads the frame (`texImage2D`, no mipmaps, linear,
    clamped) at most once per rendered frame into a texture per poster, deleted on `forget`,
    `dispose` and context loss; a layer without a frame draws the poster's texture.
  - **DOM**: `dom-live-video.ts` shows the clip's `<video>` right after the poster `<img>` with the
    poster's inline style (`object-fit: fill`), under the caption; frames that are no video element
    leave the poster.
- **Layouts (ADR-0028)**: `slide-layout.ts` is the one place that decides, per viewport, whether a
  slide covers, is drawn whole over a blurred fill, or splits into a pair's two halves; both
  renderers call it, so a transition's `from` and `to` can each have their own layout. A pair's
  `Slide.partner` loads as a second picture per slide (`frame-pictures.ts`,
  `picture-buffer.ts`), carried on `SlideLayer.partner`.
  - **WebGL**: each layer gets a layout uniform, a partner sampler and crop, and the rects a pair
    or a blurred fill's front picture draw in; `layer-uniforms.ts` turns a `SlideLayout` into
    those uniforms, `bind-layer.ts` binds them, and `layerColor` in the fragment shader prelude
    switches on the layout inside `fromColor`/`toColor`, so every transition effect carries it.
    The blurred fill's backdrop (`blurredDarkened`) reads the layer's backdrop texture (bound by
    `bind-layer.ts` for a blurred fill only) at the same crop and darkens it: the picture shrunk
    to `BACKDROP_LONG_SIDE` pixels and blurred once when prepared (`backdrop-texture.ts`,
    `backdrop-blur.ts`, three box passes per axis), magnified smoothly without mipmaps.
  - **DOM**: `dom-layer-placement.ts` places a pair's two pictures each in their own wrapper,
    clipped (`overflow: hidden`) to their half; a blurred fill wraps the front picture the same
    way and draws a second, cloned `<img>` behind it with `filter: blur(...) brightness(...)`.
    The blur radius is `BACKDROP_BLUR_RADIUS_SHARE` of the picture's long side, set in the
    backdrop's own pixels so its transform scales it with the picture, as the WebGL backdrop's
    blur is. The backdrop and the front's wrapper sit in one group node that carries the layer's
    opacity, so a crossfade blends the layer as a whole, as WebGL does, and the backdrop never
    shows through a half-transparent front. A caption, which only a single, unpaired slide ever
    carries, follows the layer's top-level node (the picture itself when covering, its group for
    the blurred fill) so it stays screen-space regardless of layout.
- **Looks (ADR-0044)**: a frame's `look` grades every picture and video layer, never a ground
  slide, a veil, card text, a caption or the end fade — the table, the maths and each renderer's
  exact mechanism are in `dev-docs/player/LOOKS.md`.
