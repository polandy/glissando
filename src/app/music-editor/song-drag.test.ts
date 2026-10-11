import { describe, expect, it } from "vitest";
import { SongDrag, songIndexAfterKey } from "./song-drag";

/** Three rows of 40 px from y 100: row 0 is 100..140, row 1 140..180, row 2 180..220. */
const ROWS = [0, 1, 2].map((index) => ({ top: 100 + index * 40, bottom: 140 + index * 40 }));

function dragOver() {
  const moves: string[] = [];
  const drag = new SongDrag({
    rows: () => ROWS,
    onMove: (songId, toIndex) => moves.push(`${songId} → ${toIndex}`),
  });
  return { drag, moves };
}

describe("SongDrag, reordering the playlist by its grips", () => {
  it("moves a song to the row it is dropped on", () => {
    const { drag, moves } = dragOver();

    drag.down({ songId: "a", index: 0, pointerId: 1, y: 120 });
    drag.move({ pointerId: 1, y: 200 });
    drag.up({ pointerId: 1 });

    expect(moves).toEqual(["a → 2"]);
  });

  it("shows the row a drag would drop on while it moves", () => {
    const { drag } = dragOver();

    drag.down({ songId: "c", index: 2, pointerId: 1, y: 200 });
    drag.move({ pointerId: 1, y: 150 });

    expect(drag.state).toEqual({ songId: "c", overIndex: 1 });
  });

  it("takes a drop above the first row or below the last as the list's edge", () => {
    const { drag, moves } = dragOver();

    drag.down({ songId: "b", index: 1, pointerId: 1, y: 160 });
    drag.move({ pointerId: 1, y: 20 });
    drag.up({ pointerId: 1 });

    expect(moves).toEqual(["b → 0"]);
  });

  it("moves nothing for a drop on the song's own row", () => {
    const { drag, moves } = dragOver();

    drag.down({ songId: "b", index: 1, pointerId: 1, y: 160 });
    drag.move({ pointerId: 1, y: 170 });
    drag.up({ pointerId: 1 });

    expect(moves).toEqual([]);
    expect(drag.state).toBeNull();
  });

  it("ignores a second pointer, and moves nothing once cancelled", () => {
    const { drag, moves } = dragOver();

    drag.down({ songId: "a", index: 0, pointerId: 1, y: 120 });
    drag.move({ pointerId: 2, y: 200 });
    drag.up({ pointerId: 2 });
    expect(drag.state).toEqual({ songId: "a", overIndex: 0 });
    drag.move({ pointerId: 1, y: 200 });
    drag.cancel();
    drag.up({ pointerId: 1 });

    expect(moves).toEqual([]);
  });
});

describe("songIndexAfterKey, reordering with the arrow keys on a grip", () => {
  it.each([
    ["ArrowUp", 1, 0],
    ["ArrowDown", 1, 2],
    ["ArrowUp", 0, null],
    ["ArrowDown", 2, null],
    ["Enter", 1, null],
  ])("%s at %i of three goes to %s", (key, index, expected) => {
    expect(songIndexAfterKey(key, index, 3)).toBe(expected);
  });
});
