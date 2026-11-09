import { describe, expect, it } from "vitest";
import { fetchPlaceText } from "./fetch-place-text";

describe("fetchPlaceText", () => {
  it("returns the body of an ok response", async () => {
    const text = await fetchPlaceText(
      () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve("Lisbon") }),
      "./p.tsv",
    );
    expect(text).toBe("Lisbon");
  });

  it("throws naming the status when the response is not ok", async () => {
    await expect(
      fetchPlaceText(
        () => Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("<html>") }),
        "./p.tsv",
      ),
    ).rejects.toThrow("answered 404");
  });
});
