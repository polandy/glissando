import type { Slideshow } from "../slideshow";
import { ImageElementLoader, type BrowserPicture } from "../browser/picture-loader";

export const RED = [255, 0, 0] as const;
export const GREEN = [0, 255, 0] as const;
export const BLUE = [0, 0, 255] as const;
export const WHITE = [255, 255, 255] as const;
export type Rgb = readonly [number, number, number];

const PICTURE_SIZE = 64;

function css([red, green, blue]: Rgb): string {
  return `rgb(${red} ${green} ${blue})`;
}

async function pictureFrom(
  draw: (context: CanvasRenderingContext2D) => void,
): Promise<BrowserPicture> {
  const canvas = document.createElement("canvas");
  canvas.width = PICTURE_SIZE;
  canvas.height = PICTURE_SIZE;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("no 2D canvas context to draw a test picture");
  }
  draw(context);
  return new ImageElementLoader().load(canvas.toDataURL());
}

export function solidPicture(colour: Rgb): Promise<BrowserPicture> {
  return pictureFrom((context) => {
    context.fillStyle = css(colour);
    context.fillRect(0, 0, PICTURE_SIZE, PICTURE_SIZE);
  });
}

/** Red top left, green top right, blue bottom left, white bottom right. */
export function quadrantPicture(): Promise<BrowserPicture> {
  const half = PICTURE_SIZE / 2;
  return pictureFrom((context) => {
    for (const [colour, x, y] of [
      [RED, 0, 0],
      [GREEN, half, 0],
      [BLUE, 0, half],
      [WHITE, half, half],
    ] as const) {
      context.fillStyle = css(colour);
      context.fillRect(x, y, half, half);
    }
  });
}

/** A positioned box of `size` CSS pixels in the page. */
export function viewportBox(size: { width: number; height: number }): HTMLElement {
  const box = document.createElement("div");
  Object.assign(box.style, {
    position: "relative",
    width: `${size.width}px`,
    height: `${size.height}px`,
  });
  document.body.append(box);
  return box;
}

/** A one-slide slideshow of a red picture. */
export async function oneSlideShow(): Promise<Slideshow> {
  const picture = await solidPicture(RED);
  return {
    formatVersion: 1,
    title: "July 2025",
    slides: [
      {
        image: { src: picture.element.src, capturedAt: "2025-07-01T10:00:00Z" },
        durationMs: 5000,
        kenBurns: {
          from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
          to: { zoom: 1.2, centerX: 0.5, centerY: 0.5 },
          easing: "ease-in-out",
        },
      },
    ],
  };
}

/** Resolves on the player's first drawn frame. */
export function firstFrame(target: EventTarget): Promise<Event> {
  return new Promise((resolve) => target.addEventListener("canplay", resolve, { once: true }));
}
