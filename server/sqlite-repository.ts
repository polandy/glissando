import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { MusicBeats } from "../src/beats/music-beats";
import { parseMusicBeats } from "../src/beats/music-beats-json";
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
  CREATE TABLE IF NOT EXISTS music_beats (
    music_id TEXT PRIMARY KEY,
    beats TEXT NOT NULL
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
  const findMusicBeats = statement("SELECT beats FROM music_beats WHERE music_id = ?");
  const putMusicBeats = statement(
    `INSERT INTO music_beats (music_id, beats) VALUES (?, ?)
       ON CONFLICT (music_id) DO UPDATE SET beats = excluded.beats`,
  );
  const deleteMusicBeats = statement("DELETE FROM music_beats WHERE music_id = ?");
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
      deleteMusicBeats.run(id);
    },
    findMusicBeats(id) {
      const row = findMusicBeats.get(id);
      return row === undefined ? undefined : musicBeatsOf(row);
    },
    putMusicBeats(id, beats) {
      putMusicBeats.run(id, JSON.stringify(beats));
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

function musicBeatsOf(row: Row): MusicBeats {
  const stored = text(row, "beats");
  const beats = parseMusicBeats(JSON.parse(stored));
  // What the database holds was validated on the way in; reading it again fails loud on damage.
  if (beats === undefined) {
    throw new Error(`database column beats holds ${stored}, not valid MusicBeats`);
  }
  return beats;
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
