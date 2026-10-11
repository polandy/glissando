import { encodeJpeg, fitWithin, THUMBNAIL_BOUND } from "../../import/downscale";

/**
 * Generated photo-like scenes, drawn on a canvas and stored as the import stores a thumbnail:
 * no photo is involved. A scene has sky, hills, a sun, a standing figure and a grassy texture.
 */
export interface SceneOptions {
  /** Hue of the sky; scenes of different hues are different scenes. */
  readonly hue: number;
  /** Camera drift to the right, in pixels of a picture 1200 pixels wide. */
  readonly drift?: number;
  /**
   * Out of focus by this factor: drawn this many times smaller and scaled up again, which blurs
   * alike in every engine (a canvas filter does not).
   */
  readonly softness?: number;
  /** Pixel width of the full-size picture, 1200 by default; the height is three quarters of it. */
  readonly width?: number;
}

const FULL_WIDTH = 1200;
const THUMBNAIL_QUALITY = 0.8;

/** Draws the scene at full size and encodes it as the 480 px JPEG thumbnail the import stores. */
export async function sceneThumbnail(options: SceneOptions): Promise<Blob> {
  const canvas = drawScene(options);
  const bitmap = await createImageBitmap(canvas);
  try {
    return await encodeJpeg(bitmap, fitWithin(bitmap, THUMBNAIL_BOUND), THUMBNAIL_QUALITY);
  } finally {
    bitmap.close();
  }
}

/** The scene as a full-size picture file, as a camera would give it. */
export async function sceneFile(name: string, options: SceneOptions): Promise<File> {
  const canvas = drawScene(options);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_QUALITY),
  );
  if (blob === null) throw new Error(`the scene ${name} could not be encoded`);
  return new File([blob], name, { type: "image/jpeg" });
}

function drawScene({
  softness = 1,
  width = FULL_WIDTH,
  ...scene
}: SceneOptions): HTMLCanvasElement {
  const height = Math.round((width * 3) / 4);
  const sharp = drawSharpScene(scene, Math.round(width / softness));
  if (softness === 1) return sharp;
  const canvas = canvasOf(width, height);
  const context = contextOf(canvas);
  context.imageSmoothingQuality = "high";
  context.drawImage(sharp, 0, 0, width, height);
  return canvas;
}

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D canvas to draw a scene on");
  return context;
}

function drawSharpScene(
  { hue, drift = 0 }: Pick<SceneOptions, "hue" | "drift">,
  width: number,
): HTMLCanvasElement {
  const canvas = canvasOf(width, Math.round((width * 3) / 4));
  const context = contextOf(canvas);
  context.translate((-drift * width) / FULL_WIDTH, 0);
  const scale = width / 160;
  context.scale(scale, scale);
  const random = seeded(hue * 13 + 7);
  const sky = context.createLinearGradient(0, 0, 0, 80);
  sky.addColorStop(0, `hsl(${hue} 55% 55%)`);
  sky.addColorStop(1, `hsl(${(hue + 30) % 360} 70% 84%)`);
  context.fillStyle = sky;
  context.fillRect(-10, -10, 190, 140);
  context.fillStyle = "hsl(50 95% 92%)";
  context.beginPath();
  context.arc(30 + (hue % 100), 28, 11, 0, 2 * Math.PI);
  context.fill();
  context.fillStyle = `hsl(${(hue + 180) % 360} 22% 38%)`;
  context.beginPath();
  context.moveTo(-10, 80);
  for (let x = -10; x <= 180; x += 12) context.lineTo(x, 42 + random() * 32);
  context.lineTo(180, 80);
  context.fill();
  context.fillStyle = `hsl(${hue} 45% 44%)`;
  context.fillRect(-10, 80, 190, 50);
  for (let blade = 0; blade < 900; blade++) {
    context.fillStyle = `hsl(${hue} 45% ${25 + random() * 45}%)`;
    context.fillRect(random() * 180 - 10, 80 + random() * 40, 0.6, 1.6 + random() * 2);
  }
  context.fillStyle = `hsl(${(hue + 200) % 360} 35% 22%)`;
  context.fillRect(70, 62, 8, 26);
  context.beginPath();
  context.arc(74, 56, 7, 0, 2 * Math.PI);
  context.fill();
  return canvas;
}

/** A small deterministic generator, so a scene draws the same every time. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 9301 + 49297) % 233280) / 233280;
}
