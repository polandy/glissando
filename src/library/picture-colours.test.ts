import { describe, expect, it } from "vitest";
import { pictureColours, type RgbPixel } from "./picture-colours";

const HEX_COLOUR = /^#[0-9A-F]{6}$/i;

function solid(pixel: RgbPixel, count: number): RgbPixel[] {
  return Array.from({ length: count }, () => pixel);
}

function hexToRgb(hex: string): RgbPixel {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

describe("pictureColours", () => {
  it("gives both colours as valid sRGB hex for an ordinary picture", () => {
    const pixels = [
      ...solid({ r: 220, g: 140, b: 60 }, 40),
      ...solid({ r: 30, g: 60, b: 120 }, 20),
      ...solid({ r: 10, g: 10, b: 10 }, 4),
    ];
    const { veil, accent } = pictureColours(pixels);
    expect(veil).toMatch(HEX_COLOUR);
    expect(accent).toMatch(HEX_COLOUR);
  });

  it("gives a pure grey picture chroma 0 in both veil and accent", () => {
    const pixels = solid({ r: 128, g: 128, b: 128 }, 100);
    const { veil, accent } = pictureColours(pixels);
    const veilRgb = hexToRgb(veil);
    const accentRgb = hexToRgb(accent);
    expect(veilRgb.r).toBe(veilRgb.g);
    expect(veilRgb.g).toBe(veilRgb.b);
    expect(accentRgb.r).toBe(accentRgb.g);
    expect(accentRgb.g).toBe(accentRgb.b);
  });

  it("gives a warm sunset a warm (not cool) dark veil", () => {
    // Mostly orange, a little near-black and near-white (skipped by the lightness threshold).
    const pixels = [
      ...solid({ r: 235, g: 120, b: 40 }, 50),
      ...solid({ r: 5, g: 5, b: 5 }, 10),
      ...solid({ r: 250, g: 250, b: 250 }, 10),
    ];
    const { veil } = pictureColours(pixels);
    const rgb = hexToRgb(veil);
    expect(rgb.r).toBeGreaterThan(rgb.b);
  });

  it("gives a blue lake a cool (not warm) dark veil", () => {
    const pixels = [
      ...solid({ r: 30, g: 90, b: 200 }, 50),
      ...solid({ r: 5, g: 5, b: 5 }, 10),
      ...solid({ r: 250, g: 250, b: 250 }, 10),
    ];
    const { veil } = pictureColours(pixels);
    const rgb = hexToRgb(veil);
    expect(rgb.b).toBeGreaterThan(rgb.r);
  });

  it("gives a two-hue picture an accent whose hue differs from the veil's", () => {
    // A warm majority (dominant) and a cooler, far-enough, large-enough minority (second).
    const pixels = [
      ...solid({ r: 230, g: 110, b: 40 }, 70),
      ...solid({ r: 30, g: 170, b: 180 }, 30),
    ];
    const { veil, accent } = pictureColours(pixels);
    const veilRgb = hexToRgb(veil);
    const accentRgb = hexToRgb(accent);
    // The veil (dominant, warm) leans red over blue; the accent (second, cooler) does not.
    expect(veilRgb.r).toBeGreaterThan(veilRgb.b);
    expect(accentRgb.b).toBeGreaterThanOrEqual(accentRgb.r);
  });

  it("does not let a minority hue under the weight threshold become the accent", () => {
    // The minority is far enough in hue but too small a share to count as a second hue.
    const pixels = [
      ...solid({ r: 230, g: 110, b: 40 }, 95),
      ...solid({ r: 30, g: 170, b: 180 }, 5),
    ];
    const { veil, accent } = pictureColours(pixels);
    const veilRgb = hexToRgb(veil);
    const accentRgb = hexToRgb(accent);
    // Falls back to the dominant hue: both warm, red over blue.
    expect(veilRgb.r).toBeGreaterThan(veilRgb.b);
    expect(accentRgb.r).toBeGreaterThan(accentRgb.b);
  });

  it("gives an empty sample grey colours instead of throwing or dividing by zero", () => {
    const { veil, accent } = pictureColours([]);
    expect(veil).toMatch(HEX_COLOUR);
    expect(accent).toMatch(HEX_COLOUR);
    const veilRgb = hexToRgb(veil);
    expect(veilRgb.r).toBe(veilRgb.g);
    expect(veilRgb.g).toBe(veilRgb.b);
  });

  it("keeps a very saturated picture's colours within sRGB (gamut clipping)", () => {
    const pixels = solid({ r: 255, g: 0, b: 255 }, 50);
    const { veil, accent } = pictureColours(pixels);
    expect(veil).toMatch(HEX_COLOUR);
    expect(accent).toMatch(HEX_COLOUR);
  });
});
