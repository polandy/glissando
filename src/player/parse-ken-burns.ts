import { readObject, readOneOf, readUnitInterval, SlideshowFormatError } from "./parse-primitives";
import { EASINGS, MIN_KEN_BURNS_ZOOM, type Easing, type Framing, type KenBurns } from "./slideshow";

export function readKenBurns(value: unknown, path: string): KenBurns {
  const kenBurns = readObject(value, path, ["from", "to", "easing"]);
  return {
    from: readFraming(kenBurns.from, `${path}.from`),
    to: readFraming(kenBurns.to, `${path}.to`),
    easing: readOneOf<Easing>(kenBurns.easing, `${path}.easing`, EASINGS),
  };
}

function readFraming(value: unknown, path: string): Framing {
  const framing = readObject(value, path, ["zoom", "centerX", "centerY"]);
  const zoom = framing.zoom;
  if (typeof zoom !== "number" || !Number.isFinite(zoom) || zoom < MIN_KEN_BURNS_ZOOM) {
    throw new SlideshowFormatError(`${path}.zoom`, `a number ≥ ${MIN_KEN_BURNS_ZOOM}`, zoom);
  }
  return {
    zoom,
    centerX: readUnitInterval(framing.centerX, `${path}.centerX`),
    centerY: readUnitInterval(framing.centerY, `${path}.centerY`),
  };
}
