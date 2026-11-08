import { describe, expect, it } from "vitest";
import { linkProgram } from "./link-program";

interface Fake {
  gl: WebGL2RenderingContext;
  deletedShaders: number;
  deletedPrograms: number;
}

function fakeGl(options: { compiles: boolean; links: boolean }): Fake {
  const fake = { deletedShaders: 0, deletedPrograms: 0 } as Fake;
  fake.gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    COMPILE_STATUS: 3,
    LINK_STATUS: 4,
    createProgram: () => ({}),
    createShader: () => ({}),
    shaderSource: () => undefined,
    compileShader: () => undefined,
    getShaderParameter: () => options.compiles,
    getShaderInfoLog: () => "bad shader",
    attachShader: () => undefined,
    bindAttribLocation: () => undefined,
    linkProgram: () => undefined,
    getProgramParameter: () => options.links,
    getProgramInfoLog: () => "bad link",
    deleteShader: () => {
      fake.deletedShaders += 1;
    },
    deleteProgram: () => {
      fake.deletedPrograms += 1;
    },
  } as unknown as WebGL2RenderingContext;
  return fake;
}

const link = (gl: WebGL2RenderingContext) =>
  linkProgram(gl, "v", "f", new Map([["position", 0]]), (log) => new Error(log));

describe("linkProgram", () => {
  it("keeps the program and deletes only the shaders on success", () => {
    const fake = fakeGl({ compiles: true, links: true });
    expect(link(fake.gl)).toBeDefined();
    expect([fake.deletedShaders, fake.deletedPrograms]).toEqual([2, 0]);
  });

  it("deletes the shader and the program before throwing a compile failure", () => {
    const fake = fakeGl({ compiles: false, links: true });
    expect(() => link(fake.gl)).toThrow("bad shader");
    expect([fake.deletedShaders, fake.deletedPrograms]).toEqual([1, 1]);
  });

  it("deletes both shaders and the program before throwing a link failure", () => {
    const fake = fakeGl({ compiles: true, links: false });
    expect(() => link(fake.gl)).toThrow("bad link");
    expect([fake.deletedShaders, fake.deletedPrograms]).toEqual([2, 1]);
  });
});
