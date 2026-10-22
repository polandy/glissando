import type { BitmapPicture } from "../browser/bitmap-loader";
import { CardItemLayouts } from "../card-item-layouts";
import { canvasCardMeasure } from "../card-measure";
import type { Fonts } from "../fonts";
import type { Size } from "../ken-burns";
import type { PreparedSlide, RenderFrame, SlideRenderer } from "../ports";
import type { CardStyle, TransitionEffect } from "../slideshow";
import { bindCaption } from "./bind-overlays";
import { bindLayer, fromUniforms, toUniforms, type LayerTextureUnits } from "./bind-layer";
import { bindLook } from "./bind-look";
import { CaptionTextures } from "./caption-textures";
import { CardRenderTarget } from "./card-render-target";
import { renderCardLayer } from "./card-pass";
import { CardItemProgram } from "./card-item-program";
import { CardTextures } from "./card-textures";
import { PictureTextures } from "./picture-textures";
import { prepareSlide } from "./prepare-slide";
import { compilePrograms, type EffectProgram } from "./shader-programs";

/** A single slide is a crossfade that has not started. */
const SINGLE_SLIDE_EFFECT: TransitionEffect = "crossfade";
const FULL_SCREEN_TRIANGLE_STRIP = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const VERTEX_COUNT = 4;
const POSITION_ATTRIBUTE = 0;
const COORDINATES_PER_VERTEX = 2;
const FROM_TEXTURE_UNITS: LayerTextureUnits = { picture: 0, partner: 4, backdrop: 6 };
const TO_TEXTURE_UNITS: LayerTextureUnits = { picture: 1, partner: 5, backdrop: 7 };
const FROM_CAPTION_TEXTURE_UNIT = 2;
const TO_CAPTION_TEXTURE_UNIT = 3;
const FROM_CARD_TEXTURE_UNIT = 8;
const TO_CARD_TEXTURE_UNIT = 9;

export interface WebGlRendererOptions {
  /** Device pixels per CSS pixel. */
  readonly pixelRatio?: () => number;
  /** Loads the caption font; captions are drawn once it has. */
  readonly fonts?: Fonts;
  /** A fixed drawing buffer, e.g. a video's frame size, instead of the CSS size × pixel ratio. */
  readonly drawingSize?: Size;
  /** Memoises a card's item slices per card and stage; a fresh one, backed by a throwaway Canvas
   * 2D context, without it. */
  readonly cardItemLayouts?: CardItemLayouts;
}

/** Draws slides and the GLSL transitions into a canvas that fills its container. */
export class WebGlRenderer implements SlideRenderer<BitmapPicture> {
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #onResize: () => void;
  #programs: ReadonlyMap<TransitionEffect, EffectProgram> = new Map();
  readonly #pictures: PictureTextures;
  readonly #pixelRatio: () => number;
  readonly #captions: CaptionTextures;
  /** Kept for the renderer's lifetime: a slideshow carries at most an opening and a closing card
   * (`dev-docs/player/TITLE_CARDS.md`), so never released per slide (ADR-0032). */
  readonly #cards: CardTextures;
  /** Draws a card's per-item quads (ADR-0032 § Entrances) into a `CardRenderTarget`. */
  #cardItems!: CardItemProgram;
  /** The `from`/`to` layers' own card, rasterised into a screen-sized texture each frame, so the
   * transition shader carries it exactly as it carries that layer's picture (ADR-0032). Reused
   * for the renderer's lifetime; never reallocated per frame (`card-render-target.ts`). */
  readonly #fromCardTarget: CardRenderTarget;
  readonly #toCardTarget: CardRenderTarget;
  readonly #cardItemLayouts: CardItemLayouts;
  #mainBuffer!: WebGLBuffer;
  #captionInsetCssPixels = 0;
  readonly #drawingSize: Size | undefined;
  /** None with a fixed drawing size, which no layout changes. */
  readonly #resizeObserver: ResizeObserver | null;
  /** Set between `webglcontextlost` and `webglcontextrestored`; no GL call is safe meanwhile. */
  #contextLost = false;

  constructor(
    canvas: HTMLCanvasElement,
    gl: WebGL2RenderingContext,
    onResize: () => void,
    {
      pixelRatio = () => devicePixelRatio,
      fonts = document.fonts,
      drawingSize,
      cardItemLayouts = new CardItemLayouts(canvasCardMeasure),
    }: WebGlRendererOptions = {},
  ) {
    this.#canvas = canvas;
    this.#gl = gl;
    this.#onResize = onResize;
    this.#pixelRatio = pixelRatio;
    this.#drawingSize = drawingSize;
    this.#cardItemLayouts = cardItemLayouts;
    this.#setUpGlResources();
    this.#pictures = new PictureTextures(gl);
    this.#captions = new CaptionTextures(gl, fonts, pixelRatio, onResize);
    this.#cards = new CardTextures(gl, fonts, onResize);
    this.#fromCardTarget = new CardRenderTarget(gl);
    this.#toCardTarget = new CardRenderTarget(gl);
    canvas.addEventListener("webglcontextlost", this.#handleContextLost);
    canvas.addEventListener("webglcontextrestored", this.#handleContextRestored);
    this.#resizeObserver = drawingSize === undefined ? new ResizeObserver(onResize) : null;
    this.#resizeObserver?.observe(canvas);
  }

  /** The vertex buffer, its attribute binding, every transition's shader program, and the card
   * item program — all GL objects a lost context destroys and `#handleContextRestored` rebuilds. */
  #setUpGlResources(): void {
    const gl = this.#gl;
    const buffer = gl.createBuffer();
    if (buffer === null) {
      throw new Error("createBuffer returned null for the full-screen quad");
    }
    this.#mainBuffer = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, FULL_SCREEN_TRIANGLE_STRIP, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(POSITION_ATTRIBUTE);
    gl.vertexAttribPointer(POSITION_ATTRIBUTE, COORDINATES_PER_VERTEX, gl.FLOAT, false, 0, 0);
    this.#programs = compilePrograms(gl, POSITION_ATTRIBUTE);
    this.#cardItems = new CardItemProgram(gl);
  }

  readonly #handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.#contextLost = true;
  };

  /**
   * The lost context destroyed every GL object; rebuild them, then let the player redraw.
   * Textures are not re-uploaded here: they are uploaded anew, from the bitmaps the player still
   * holds, when each picture is next prepared or drawn.
   */
  readonly #handleContextRestored = (): void => {
    this.#pictures.recreate();
    this.#setUpGlResources();
    this.#captions.recreate();
    this.#cards.recreate();
    this.#fromCardTarget.recreate();
    this.#toCardTarget.recreate();
    this.#contextLost = false;
    this.#onResize();
  };

  render(frame: RenderFrame<BitmapPicture>): void {
    if (this.#contextLost) {
      return;
    }
    const gl = this.#gl;
    this.#pictures.beginFrame();
    const viewport = this.#fitCanvasToDisplay();
    gl.viewport(0, 0, viewport.width, viewport.height);
    const [effect, progress, from, to] =
      frame.kind === "slide"
        ? [SINGLE_SLIDE_EFFECT, 0, frame.slide, frame.slide]
        : [frame.effect, frame.progress, frame.from, frame.to];
    renderCardLayer(
      gl,
      this.#cardItems,
      this.#cards,
      this.#cardItemLayouts,
      this.#fromCardTarget,
      from,
      viewport,
    );
    renderCardLayer(
      gl,
      this.#cardItems,
      this.#cards,
      this.#cardItemLayouts,
      this.#toCardTarget,
      to,
      viewport,
    );
    const { program, uniforms } = this.#program(effect);
    gl.useProgram(program);
    bindLayer(gl, this.#pictures, FROM_TEXTURE_UNITS, from, fromUniforms(uniforms), viewport);
    bindLayer(gl, this.#pictures, TO_TEXTURE_UNITS, to, toUniforms(uniforms), viewport);
    bindCaption(
      gl,
      this.#captions,
      FROM_CAPTION_TEXTURE_UNIT,
      from,
      uniforms.fromCaption,
      uniforms.fromCaptionOpacity,
      viewport,
    );
    bindCaption(
      gl,
      this.#captions,
      TO_CAPTION_TEXTURE_UNIT,
      to,
      uniforms.toCaption,
      uniforms.toCaptionOpacity,
      viewport,
    );
    this.#bindCardTexture(FROM_CARD_TEXTURE_UNIT, this.#fromCardTarget, uniforms.fromCard);
    this.#bindCardTexture(TO_CARD_TEXTURE_UNIT, this.#toCardTarget, uniforms.toCard);
    gl.uniform1f(uniforms.progress, progress);
    gl.uniform1f(uniforms.aspect, viewport.width / viewport.height);
    gl.uniform1f(uniforms.captionBand, this.#captions.bandShare(viewport));
    gl.uniform1f(
      uniforms.captionInset,
      (this.#captionInsetCssPixels * this.#pixelRatio()) / viewport.height,
    );
    gl.uniform1f(uniforms.endFade, frame.endFade);
    bindLook(gl, uniforms, frame.look);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#mainBuffer);
    gl.vertexAttribPointer(POSITION_ATTRIBUTE, COORDINATES_PER_VERTEX, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, VERTEX_COUNT);
  }

  /** Binds a layer's rendered card texture (or none, drawn transparent by `renderCardLayer`) to
   * the main program's `sampler` uniform. */
  #bindCardTexture(
    unit: number,
    target: CardRenderTarget,
    sampler: WebGLUniformLocation | null,
  ): void {
    const gl = this.#gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.uniform1i(sampler, unit);
  }

  /** Delegates to `prepareSlide`: one upload step of the picture (and its backdrop) per call,
   * then its caption and card, or a ground slide's card alone (see `PictureTextures`). */
  prepare(slide: PreparedSlide<BitmapPicture>): void {
    if (this.#contextLost) {
      return;
    }
    prepareSlide(
      {
        pictures: this.#pictures,
        captions: this.#captions,
        cards: this.#cards,
        displaySize: () => this.#displaySize(),
      },
      slide,
    );
  }

  setCaptionInset(cssPixels: number): void {
    this.#captionInsetCssPixels = cssPixels;
  }

  /** Settles once captions can be drawn, after asking the player for a redraw. */
  get captionFontLoaded(): Promise<void> {
    return this.#captions.fontLoaded;
  }

  /** Settles once `style`'s card fonts can be drawn, after asking the player for a redraw. */
  cardFontLoaded(style: CardStyle): Promise<void> {
    return this.#cards.fontLoaded(style);
  }

  forget(picture: BitmapPicture): void {
    this.#captions.forget(picture);
    this.#pictures.forget(picture);
  }

  dispose(): void {
    this.#canvas.removeEventListener("webglcontextlost", this.#handleContextLost);
    this.#canvas.removeEventListener("webglcontextrestored", this.#handleContextRestored);
    this.#resizeObserver?.disconnect();
    this.#pictures.dispose();
    this.#captions.dispose();
    this.#cards.dispose();
    this.#cardItems.dispose();
    this.#fromCardTarget.dispose();
    this.#toCardTarget.dispose();
    this.#programs.forEach(({ program }) => this.#gl.deleteProgram(program));
    this.#canvas.remove();
  }

  #displaySize(): Size {
    if (this.#drawingSize !== undefined) {
      return this.#drawingSize;
    }
    return {
      width: Math.max(1, Math.round(this.#canvas.clientWidth * this.#pixelRatio())),
      height: Math.max(1, Math.round(this.#canvas.clientHeight * this.#pixelRatio())),
    };
  }

  #fitCanvasToDisplay(): Size {
    const { width, height } = this.#displaySize();
    if (this.#canvas.width !== width || this.#canvas.height !== height) {
      this.#canvas.width = width;
      this.#canvas.height = height;
    }
    return { width, height };
  }

  #program(effect: TransitionEffect): EffectProgram {
    const program = this.#programs.get(effect);
    if (program === undefined) {
      throw new Error(`no shader program for the ${effect} transition`);
    }
    return program;
  }
}
