import { describe, expect, it } from "vitest";
import { captionStyles } from "./caption-style";

describe("captionStyles", () => {
  it("sizes the band and the type from the viewport like the drawn caption", () => {
    const { band, text } = captionStyles({ width: 1000, height: 1000 }, 0);

    expect(band.height).toBe("420px");
    expect(band.paddingLeft).toBe("50.4px");
    expect(band.paddingBottom).toBe("46.2px");
    expect(text.font).toBe('600 42px / 1.22 "Instrument Sans", sans-serif');
    expect(text.maxWidth).toBe("720px");
  });

  it("lays the same gradient as the drawn caption", () => {
    expect(captionStyles({ width: 1000, height: 1000 }, 0).band.background).toBe(
      "radial-gradient(120% 100% at 0% 100%, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 55%, rgba(0, 0, 0, 0) 80%)",
    );
  });

  it("lifts the band by the inset", () => {
    expect(captionStyles({ width: 1000, height: 1000 }, 64).band.transform).toBe(
      "translateY(-64px)",
    );
  });

  it("clamps the text to two lines", () => {
    expect(captionStyles({ width: 1000, height: 1000 }, 0).text.webkitLineClamp).toBe("2");
  });
});
