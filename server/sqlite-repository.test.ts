import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { describeLibraryRepositoryContract } from "./repository-contract";
import { openSqliteRepository } from "./sqlite-repository";
import { NewerSqliteSchemaError, SQLITE_SCHEMA_VERSION } from "./sqlite-schema";
import { SERVER_DOCUMENT_FORMAT_VERSION } from "../src/server-library/server-document";
import { without } from "../src/server-library/server-document-fixtures";
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

  it("stamps the schema version, also on a database its tables were created in before", () => {
    const database = new DatabaseSync(IN_MEMORY);
    openSqliteRepository(database, ignoreLog);
    database.exec("PRAGMA user_version = 0");
    openSqliteRepository(database, ignoreLog);
    expect(database.prepare("PRAGMA user_version").get()).toEqual({
      user_version: SQLITE_SCHEMA_VERSION,
    });
  });

  it("refuses a database a newer schema version wrote and leaves it as it was", () => {
    const database = new DatabaseSync(IN_MEMORY);
    const newer = SQLITE_SCHEMA_VERSION + 1;
    database.exec(`PRAGMA user_version = ${newer}`);
    expect(() => openSqliteRepository(database, ignoreLog)).toThrow(NewerSqliteSchemaError);
    expect(database.prepare("PRAGMA user_version").get()).toEqual({ user_version: newer });
    expect(database.prepare("SELECT count(*) AS tables FROM sqlite_schema").get()).toEqual({
      tables: 0,
    });
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
      .run("show-newer", 1, 2000, JSON.stringify({ ...sampleDocument(), formatVersion: 99 }));

    expect(repository.listSlideshows().map(({ id }) => id)).toEqual(["show-a"]);
    expect(logged).toEqual([expect.stringMatching(/show-newer.*formatVersion/)]);
  });

  it("lists a document of an older format version as the current version", () => {
    const database = new DatabaseSync(IN_MEMORY);
    const repository = openSqliteRepository(database, ignoreLog);
    const { slideshow } = sampleDocument();
    const versionOneShow = {
      ...without(slideshow, "songs"),
      pictures: slideshow.pictures.map((picture) => without(picture, "colours")),
      music: {
        musicId: "music-1",
        fileName: "track.m4a",
        durationMs: 60000,
        mimeType: "audio/mp4",
      },
    };
    database
      .prepare(`INSERT INTO slideshows (id, revision, created_at, document) VALUES (?, ?, ?, ?)`)
      .run(
        "show-old",
        1,
        2000,
        JSON.stringify({ ...sampleDocument(), formatVersion: 1, slideshow: versionOneShow }),
      );

    expect(repository.listSlideshows()).toMatchObject([
      {
        id: "show-old",
        document: {
          formatVersion: SERVER_DOCUMENT_FORMAT_VERSION,
          slideshow: { songs: [{ musicId: "music-1" }] },
        },
      },
    ]);
  });
});
