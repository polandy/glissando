import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { describeLibraryRepositoryContract } from "./repository-contract";
import { openSqliteRepository } from "./sqlite-repository";
import { sampleDocument } from "./testing/library-harness";

const IN_MEMORY = ":memory:";

const ignoreLog = () => undefined;

describeLibraryRepositoryContract("SQLite", () =>
  openSqliteRepository(new DatabaseSync(IN_MEMORY), ignoreLog),
);

describe("openSqliteRepository", () => {
  it("creates its tables once, so a database opened again keeps what it had", () => {
    const database = new DatabaseSync(IN_MEMORY);
    openSqliteRepository(database, ignoreLog).insertMusic({
      id: "music-a",
      contentType: "audio/mp4",
      bytes: new Uint8Array([1]),
      uploadedAt: 1000,
    });
    expect(openSqliteRepository(database, ignoreLog).findMusic("music-a")).toBeDefined();
  });

  it("turns foreign keys on, so deleting a slideshow deletes its share link in a database opened without them", () => {
    const database = new DatabaseSync(IN_MEMORY, { enableForeignKeyConstraints: false });
    const repository = openSqliteRepository(database, ignoreLog);
    repository.insertSlideshow({
      id: "show-a",
      revision: 1,
      createdAt: 1000,
      document: sampleDocument(),
    });
    repository.share("show-a", { token: "AAAAAAAAAAAAAAAAAAAAAA", createdAt: 2000 });
    repository.deleteSlideshow("show-a");
    expect(database.prepare("SELECT count(*) AS links FROM share_links").get()).toEqual({
      links: 0,
    });
  });

  it("lists the readable slideshows past one it cannot read, and logs the unreadable one's id and reason", () => {
    const database = new DatabaseSync(IN_MEMORY);
    const logged: string[] = [];
    const repository = openSqliteRepository(database, (line) => logged.push(line));
    repository.insertSlideshow({
      id: "show-a",
      revision: 1,
      createdAt: 1000,
      document: sampleDocument(),
    });
    database
      .prepare(`INSERT INTO slideshows (id, revision, created_at, document) VALUES (?, ?, ?, ?)`)
      .run("show-old", 1, 2000, JSON.stringify({ ...sampleDocument(), formatVersion: 1 }));

    expect(repository.listSlideshows().map(({ id }) => id)).toEqual(["show-a"]);
    expect(logged).toEqual([expect.stringMatching(/show-old.*formatVersion/)]);
  });
});
