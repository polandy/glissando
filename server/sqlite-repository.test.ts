import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { describeLibraryRepositoryContract } from "./repository-contract";
import { openSqliteRepository } from "./sqlite-repository";

const IN_MEMORY = ":memory:";

describeLibraryRepositoryContract("SQLite", () =>
  openSqliteRepository(new DatabaseSync(IN_MEMORY)),
);

describe("openSqliteRepository", () => {
  it("creates its tables once, so a database opened again keeps what it had", () => {
    const database = new DatabaseSync(IN_MEMORY);
    openSqliteRepository(database).insertMusic({
      id: "music-a",
      contentType: "audio/mp4",
      bytes: new Uint8Array([1]),
      uploadedAt: 1000,
    });
    expect(openSqliteRepository(database).findMusic("music-a")).toBeDefined();
  });
});
