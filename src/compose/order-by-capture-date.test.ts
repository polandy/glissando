import { describe, expect, it } from "vitest";
import { orderByCaptureDate } from "./order-by-capture-date";
import type { StoredPicture } from "../library/stored-slideshow";

function picture(id: string, capturedAt: string, fileName = id): StoredPicture {
  return { id, capturedAt, fileName, width: 100, height: 100 };
}

describe("orderByCaptureDate", () => {
  it("orders pictures ascending by capture date", () => {
    const b = picture("b", "2025-07-02T10:00:00Z");
    const a = picture("a", "2025-07-01T10:00:00Z");

    expect(orderByCaptureDate([b, a])).toEqual([a, b]);
  });

  it("breaks a tie on capture date by file name", () => {
    const z = picture("1", "2025-07-01T10:00:00Z", "z.jpg");
    const a = picture("2", "2025-07-01T10:00:00Z", "a.jpg");

    expect(orderByCaptureDate([z, a])).toEqual([a, z]);
  });

  it("breaks a tie on capture date and file name by input order", () => {
    const first = picture("1", "2025-07-01T10:00:00Z", "same.jpg");
    const second = picture("2", "2025-07-01T10:00:00Z", "same.jpg");

    expect(orderByCaptureDate([first, second])).toEqual([first, second]);
  });

  it("does not mutate the input array", () => {
    const b = picture("b", "2025-07-02T10:00:00Z");
    const a = picture("a", "2025-07-01T10:00:00Z");
    const input = [b, a];

    orderByCaptureDate(input);

    expect(input).toEqual([b, a]);
  });
});
