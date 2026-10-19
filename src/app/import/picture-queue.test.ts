import { describe, expect, it } from "vitest";
import type { ImportPick } from "../../import/picture-import";
import type { Translator } from "../i18n/translator";
import { pickName, queueRows } from "./picture-queue";

function pick(id: string, done: number, total: number): ImportPick {
  return { id, kind: "files", done, total, stored: done };
}

/** Enough of a translator to prove `pickName` picks the right key and passes the count through. */
const t = ((key: string, args?: { readonly count: number }) => {
  if (key === "import.pickImmich") return `Immich · ${args?.count} photos`;
  if (key === "units.pictures") return `${args?.count} pictures`;
  throw new Error(`pickName asked for an unexpected key "${key}"`);
}) as Translator["t"];

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

describe("pickName", () => {
  it("names a folder pick by its folder name", () => {
    const folder: ImportPick = {
      id: "a",
      kind: "folder",
      folderName: "Beach 2025",
      done: 1,
      total: 3,
      stored: 1,
    };

    expect(pickName(folder, t)).toBe("Beach 2025");
  });

  it("throws for a folder pick with no folder name", () => {
    const folder: ImportPick = { id: "a", kind: "folder", done: 1, total: 3, stored: 1 };

    expect(() => pickName(folder, t)).toThrow('pick "a"');
  });

  it("names a files pick by how many pictures it has", () => {
    expect(pickName(pick("a", 1, 3), t)).toBe("3 pictures");
  });

  it("names an Immich pick by how many photos it has", () => {
    const immich: ImportPick = { id: "a", kind: "immich", done: 1, total: 5, stored: 1 };

    expect(pickName(immich, t)).toBe("Immich · 5 photos");
  });
});
