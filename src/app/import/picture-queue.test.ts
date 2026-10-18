import { describe, expect, it } from "vitest";
import type { ImportPick } from "../../import/picture-import";
import { queueRows } from "./picture-queue";

function pick(id: string, done: number, total: number): ImportPick {
  return { id, kind: "files", done, total, stored: done };
}

describe("queueRows", () => {
  it("shows every pick when there are four or fewer", () => {
    const picks = [pick("a", 2, 2), pick("b", 1, 3)];

    const { rows, earlierDone } = queueRows(picks);

    expect(rows.map((row) => row.pick.id)).toEqual(["a", "b"]);
    expect(earlierDone).toBe(0);
  });

  it("keeps only the last four rows and counts the rest as earlier", () => {
    const picks = [
      pick("a", 2, 2),
      pick("b", 2, 2),
      pick("c", 2, 2),
      pick("d", 2, 2),
      pick("e", 1, 2),
      pick("f", 0, 2),
    ];

    const { rows, earlierDone } = queueRows(picks);

    expect(rows.map((row) => row.pick.id)).toEqual(["c", "d", "e", "f"]);
    expect(earlierDone).toBe(2);
  });

  it("marks only the earliest unfinished pick as in flight", () => {
    const picks = [pick("a", 2, 2), pick("b", 1, 3), pick("c", 0, 2)];

    const { rows } = queueRows(picks);

    expect(rows.map((row) => row.inFlight)).toEqual([false, true, false]);
  });

  it("marks a pick finished once its done count reaches its total, stopped or not", () => {
    const picks = [pick("a", 2, 2), pick("b", 1, 1), pick("c", 0, 3)];

    const { rows } = queueRows(picks);

    expect(rows.map((row) => row.finished)).toEqual([true, true, false]);
  });

  it("does not mark a pick finished while files of it are still waiting", () => {
    const picks = [pick("a", 1, 3)];

    const { rows } = queueRows(picks);

    expect(rows[0]?.finished).toBe(false);
  });
});
