/**
 * What one `render` may ask of the GPU, by GL method, for a frame whose pictures are prepared. A
 * method not named here is not bounded. Independent of the machine: it counts calls, never time.
 * A frame that exceeds it does work in the draw that belongs to `prepare`, or work no frame needs.
 */
export const FRAME_WORK_BUDGET = {
  /** One full-screen quad: a still frame, a transition frame and a card layer's composite alike. */
  drawArrays: 1,
  /** The slide's own program, or the transition's. */
  useProgram: 1,
  /** A prepared frame uploads, allocates, mips and frees nothing. */
  texImage2D: 0,
  texSubImage2D: 0,
  texStorage2D: 0,
  generateMipmap: 0,
  createTexture: 0,
  deleteTexture: 0,
  /** A frame with no visible card never leaves the default framebuffer. */
  bindFramebuffer: 0,
} as const;

/** Added per card layer that shows a card: its framebuffer is bound and the screen bound again,
 * and its card is drawn into it. */
export const CARD_LAYER_BUDGET = { bindFramebuffer: 2, drawArrays: 1 } as const;
