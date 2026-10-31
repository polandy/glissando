import { describe, expect, it } from "vitest";
import { describeExportFailure, describeExportProblem } from "./describe-export-failure";

describe("describeExportFailure", () => {
  it("maps a full storage quota to the smaller-size action", () => {
    const description = describeExportFailure(
      new DOMException("disk is full", "QuotaExceededError"),
      "video",
    );

    expect(description).toMatchObject({
      failure: "storage-full",
      title: "exportErrors.storageFullTitle",
      text: "exportErrors.storageFullText",
      action: "smaller-size",
    });
  });

  it("maps a dismissed or aborted run to stopped, nothing saved", () => {
    const description = describeExportFailure(new DOMException("aborted", "AbortError"), "video");

    expect(description).toMatchObject({
      failure: "cancelled",
      title: "exportErrors.cancelledTitle",
      text: "exportErrors.cancelledText",
      action: "try-again",
    });
  });

  it("falls back to unknown, in the words of the kind", () => {
    const video = describeExportFailure(new Error("boom"), "video");
    const page = describeExportFailure(new Error("boom"), "page");

    expect(video).toMatchObject({
      failure: "unknown",
      title: "exportErrors.unknownVideoTitle",
      text: "exportErrors.unknownText",
      action: "try-again",
    });
    expect(page.title).toBe("exportErrors.unknownPageTitle");
  });

  it("keeps the error's name and message as the details", () => {
    const error = new TypeError("encoder exploded");

    expect(describeExportFailure(error, "video").details).toBe("TypeError: encoder exploded");
  });

  it("maps a value that is no Error to unknown with the value as the details", () => {
    expect(describeExportFailure("plain string", "video")).toMatchObject({
      failure: "unknown",
      details: "plain string",
    });
    expect(describeExportFailure(undefined, "page")).toMatchObject({
      failure: "unknown",
      details: "undefined",
    });
  });

  it("does not take a look-alike message for a class", () => {
    const description = describeExportFailure(new Error("QuotaExceededError"), "video");

    expect(description.failure).toBe("unknown");
  });
});

describe("describeExportProblem", () => {
  it("names the clip that cannot be made, per kind, with a way out", () => {
    const video = describeExportProblem({ kind: "clip-unsupported", clip: 3 }, "video");
    const page = describeExportProblem({ kind: "clip-unsupported", clip: 3 }, "page");

    expect(video).toMatchObject({
      failure: "clip-unsupported",
      title: "exportErrors.clipVideoTitle",
      text: "exportErrors.clipVideoText",
      clip: 3,
      action: "try-again",
    });
    expect(page.title).toBe("exportErrors.clipPageTitle");
    expect(page.text).toBe("exportErrors.clipPageText");
  });

  it("says the browser cannot do it, closing the sheet", () => {
    const video = describeExportProblem({ kind: "unsupported" }, "video");
    const page = describeExportProblem({ kind: "unsupported" }, "page");

    expect(video).toMatchObject({
      failure: "unsupported",
      title: "exportErrors.unsupportedVideoTitle",
      text: "exportErrors.unsupportedText",
      action: "close",
    });
    expect(page.title).toBe("exportErrors.unsupportedPageTitle");
  });

  it("maps the sheet's storage-full state like a quota error", () => {
    expect(describeExportProblem({ kind: "storage-full" }, "video").failure).toBe("storage-full");
  });

  it("describes a failed run by its error", () => {
    const description = describeExportProblem({ kind: "failed", error: new Error("x") }, "page");

    expect(description).toMatchObject({ failure: "unknown", details: "Error: x" });
  });
});
