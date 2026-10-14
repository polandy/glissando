import { describe, expect, it } from "vitest";
import { fragmentShader } from "./transition-shaders";

/** The body of a function declared in the fragment shader's source, by its signature prefix. */
function functionBody(source: string, signaturePrefix: string): string {
  const start = source.indexOf(signaturePrefix);
  if (start === -1) {
    throw new Error(`no function starting with \`${signaturePrefix}\` in the shader source`);
  }
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  return source.slice(open, close);
}

describe("fragmentShader", () => {
  it("skips the card texture sample for a layer with no card (opacity 0), so a slide without a title card costs no extra fragment work", () => {
    const withCard = functionBody(fragmentShader("crossfade"), "vec4 withCard(");

    const guardIndex = withCard.indexOf("opacity <= 0.0");
    const sampleIndex = withCard.indexOf("texture(card");

    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(guardIndex).toBeLessThan(sampleIndex);
  });
});
