import { describe, expect, it } from "vitest";
import { modulesPath, qrCodeOf } from "./qr-code";

describe("modulesPath", () => {
  it("draws one unit square per dark module, by column and row", () => {
    expect(
      modulesPath([
        [true, true],
        [false, true],
      ]),
    ).toBe("M0 0h1v1h-1zM1 0h1v1h-1zM1 1h1v1h-1z");
  });

  it("draws nothing for an all-light matrix", () => {
    expect(modulesPath([[false]])).toBe("");
  });
});

describe("qrCodeOf", () => {
  const link = "https://photos.example.org/s/q7Rk2vN8xT4mWp1Lc9Hb3A";

  it("is a square of the matrix's size with a quiet zone, the same for the same link", () => {
    const code = qrCodeOf(link);

    expect(code.size).toBeGreaterThanOrEqual(25);
    expect(qrCodeOf(link)).toEqual(code);
  });

  it("leaves the quiet zone light", () => {
    expect(qrCodeOf(link).path.startsWith("M2 2")).toBe(true);
  });

  it("differs for another link", () => {
    expect(qrCodeOf(`${link}x`).path).not.toBe(qrCodeOf(link).path);
  });
});
