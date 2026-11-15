/** A channel above this is a drawn picture, not the black of a frame never painted. */
const BLACK_CHANNEL_CEILING = 16;

/** Whether `source`, drawn at `width`×`height`, is all black: no colour channel above the ceiling. */
export function isBlack(source: CanvasImageSource, width: number, height: number): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D context to read the picture's pixels with");
  context.drawImage(source, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  return !data.some((value, index) => index % 4 !== 3 && value > BLACK_CHANNEL_CEILING);
}
