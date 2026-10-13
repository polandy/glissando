import { describe, expect, it } from "vitest";
import { isCompleteTvCode, normaliseTvCode, readTvCodeQuery } from "./tv-code";

describe("normaliseTvCode (tv_remote/SESSIONS.md: 4 letters without I, L, O)", () => {
  it.each([
    { typed: "k7qm", code: "KQM" },
    { typed: "kxqm", code: "KXQM" },
    { typed: " K-X q M ", code: "KXQM" },
    { typed: "kxqmab", code: "KXQM" },
    { typed: "ILO", code: "" },
    { typed: "äÖ", code: "" },
    { typed: "", code: "" },
  ])("turns $typed into $code", ({ typed, code }) => {
    expect(normaliseTvCode(typed)).toBe(code);
  });

  it.each([
    { code: "KXQM", complete: true },
    { code: "KXQ", complete: false },
    { code: "KXQL", complete: false },
    { code: "kxqm", complete: false },
  ])("calls $code complete: $complete", ({ code, complete }) => {
    expect(isCompleteTvCode(code)).toBe(complete);
  });
});

describe("readTvCodeQuery (tv_remote/IN_THE_APP.md: the TV's QR code opens /?tv=<code>)", () => {
  it("reads the code and gives the search without it", () => {
    expect(readTvCodeQuery("?tv=kxqm")).toEqual({ code: "KXQM", search: "" });
  });

  it("keeps the other parameters", () => {
    expect(readTvCodeQuery("?a=1&tv=KXQM&b=2")).toEqual({ code: "KXQM", search: "?a=1&b=2" });
  });

  it("removes a code that is no code, reading it as none", () => {
    expect(readTvCodeQuery("?tv=KX1")).toEqual({ code: null, search: "" });
  });

  it("answers null without a tv parameter", () => {
    expect(readTvCodeQuery("?a=1")).toBeNull();
    expect(readTvCodeQuery("")).toBeNull();
  });
});
