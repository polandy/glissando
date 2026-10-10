import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import { readServerDocument } from "../src/server-library/server-document";
import type { LibraryRepository, MusicRecord, SlideshowRecord } from "./library-repository";

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS slideshows (
    id TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    document TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS music (
    id TEXT PRIMARY KEY,
    content_type TEXT NOT NULL,
    bytes BLOB NOT NULL,
    uploaded_at INTEGER NOT NULL
  );
`;
const MUSIC_ID_OF_DOCUMENT = "json_extract(document, '$.slideshow.music.musicId')";
const SLIDESHOW_COLUMNS = "id, revision, created_at, document";

type Row = Record<string, SQLOutputValue>;

/** A `LibraryRepository` in `database`, its tables created when missing. */
export function openSqliteRepository(database: DatabaseSync): LibraryRepository {
  database.exec(SCHEMA);
  const statement = (sql: string) => database.prepare(sql);
  const findSlideshow = statement(`SELECT ${SLIDESHOW_COLUMNS} FROM slideshows WHERE id = ?`);
  const listSlideshows = statement(
    `SELECT ${SLIDESHOW_COLUMNS} FROM slideshows ORDER BY created_at DESC, rowid DESC`,
  );
  const insertSlideshow = statement(
    `INSERT INTO slideshows (${SLIDESHOW_COLUMNS}) VALUES (?, ?, ?, ?)`,
  );
  const updateSlideshow = statement(
    "UPDATE slideshows SET revision = ?, document = ? WHERE id = ?",
  );
  const deleteSlideshow = statement("DELETE FROM slideshows WHERE id = ?");
  const findMusic = statement(
    "SELECT id, content_type, bytes, uploaded_at FROM music WHERE id = ?",
  );
  const insertMusic = statement(
    "INSERT INTO music (id, content_type, bytes, uploaded_at) VALUES (?, ?, ?, ?)",
  );
  const deleteMusic = statement("DELETE FROM music WHERE id = ?");
  const musicReference = statement(`SELECT 1 FROM slideshows WHERE ${MUSIC_ID_OF_DOCUMENT} = ?`);
  const unreferencedMusic = statement(
    `SELECT id FROM music WHERE uploaded_at < ? AND id NOT IN
       (SELECT ${MUSIC_ID_OF_DOCUMENT} FROM slideshows WHERE ${MUSIC_ID_OF_DOCUMENT} IS NOT NULL)
     ORDER BY uploaded_at, id`,
  );

  return {
    inTransaction(work) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = work();
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    listSlideshows: () => listSlideshows.all().map(slideshowOf),
    findSlideshow(id) {
      const row = findSlideshow.get(id);
      return row === undefined ? undefined : slideshowOf(row);
    },
    insertSlideshow({ id, revision, createdAt, document }) {
      insertSlideshow.run(id, revision, createdAt, JSON.stringify(document));
    },
    updateSlideshow(id, revision, document) {
      updateSlideshow.run(revision, JSON.stringify(document), id);
    },
    deleteSlideshow(id) {
      deleteSlideshow.run(id);
    },
    findMusic(id) {
      const row = findMusic.get(id);
      return row === undefined ? undefined : musicOf(row);
    },
    insertMusic({ id, contentType, bytes, uploadedAt }) {
      insertMusic.run(id, contentType, bytes, uploadedAt);
    },
    deleteMusic(id) {
      deleteMusic.run(id);
    },
    isMusicReferenced: (id) => musicReference.get(id) !== undefined,
    unreferencedMusicUploadedBefore: (time) =>
      unreferencedMusic.all(time).map((row) => text(row, "id")),
  };
}

function slideshowOf(row: Row): SlideshowRecord {
  return {
    id: text(row, "id"),
    revision: integer(row, "revision"),
    createdAt: integer(row, "created_at"),
    // What the database holds was validated on the way in; reading it again fails loud on damage.
    document: readServerDocument(JSON.parse(text(row, "document"))),
  };
}

function musicOf(row: Row): MusicRecord {
  const bytes = row["bytes"];
  if (!(bytes instanceof Uint8Array)) {
    throw new Error(`music ${text(row, "id")} has no bytes in the database`);
  }
  return {
    id: text(row, "id"),
    contentType: text(row, "content_type"),
    bytes,
    uploadedAt: integer(row, "uploaded_at"),
  };
}

function text(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") {
    throw new Error(`database column ${column} holds ${String(value)}, not text`);
  }
  return value;
}

function integer(row: Row, column: string): number {
  const value = row[column];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`database column ${column} holds ${String(value)}, not a whole number`);
  }
  return value;
}
