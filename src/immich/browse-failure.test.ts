import { describe, expect, it } from "vitest";
import { browseFailureOf, UNEXPECTED_FAILURE } from "./browse-failure";
import { ImmichRequestFailedError, ImmichUnavailableError } from "./immich-client";

describe("browseFailureOf", () => {
  it("is the Immich problem an unavailable request met, and reports it", () => {
    const reported: string[] = [];

    const failure = browseFailureOf(new ImmichUnavailableError("keyRejected"), (kind) =>
      reported.push(kind),
    );

    expect(failure).toBe("keyRejected");
    expect(reported).toEqual(["keyRejected"]);
  });

  it.each([
    ["a failed request", new ImmichRequestFailedError("POST api/search/metadata", 500)],
    ["an answer that does not match Immich's API", new Error("not Immich's shape")],
  ])("is unexpected for %s, reporting nothing", (_name, error) => {
    const reported: string[] = [];

    expect(browseFailureOf(error, (kind) => reported.push(kind))).toBe(UNEXPECTED_FAILURE);
    expect(reported).toEqual([]);
  });
});
