import type { DatabaseSync, SQLOutputValue } from "node:sqlite";
import type { MusicBeats } from "../src/beats/music-beats";
import { parseMusicBeats } from "../src/beats/music-beats-json";
import type { MusicLoudness } from "../src/loudness/measure-loudness";
import { musicLoudnessToJson, parseMusicLoudness } from "../src/loudness/music-loudness-json";
import type { StoredFocus } from "../src/library/picture-focus";
import { readStoredFocus } from "../src/library/read-stored-focus";
import { readServerDocument } from "../src/server-library/server-document";
import type { LibraryRepository, MusicRecord, SlideshowRecord } from "./library-repository";

// Foreign keys are off in SQLite unless a connection turns them on; share_links needs its cascade.
const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
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
  CREATE TABLE IF NOT EXISTS music_loudness (
    music_id TEXT PRIMARY KEY,
    loudness TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS share_links (
    slideshow_id TEXT PRIMARY KEY REFERENCES slideshows (id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS picture_focus (
    asset_id TEXT PRIMARY KEY,
    detector INTEGER NOT NULL,
    focus TEXT NOT NULL,
    found_at INTEGER NOT NULL
  );
  -- Every musicId the playlist's songs name (ADR-0023).
  CREATE VIEW IF NOT EXISTS document_music_ids AS
    SELECT json_extract(je.value, '$.musicId') AS music_id
    FROM slideshows, json_each(slideshows.document, '$.slideshow.songs') AS je;
  -- Every immichAssetId a slideshow's pictures name (ADR-0041).
  CREATE VIEW IF NOT EXISTS document_picture_asset_ids AS
    SELECT json_extract(je.value, '$.immichAssetId') AS asset_id
    FROM slideshows, json_each(slideshows.document, '$.slideshow.pictures') AS je;
`;
const SLIDESHOW_COLUMNS = "id, revision, created_at, document";

type Row = Record<string, SQLOutputValue>;

/**
 * A `LibraryRepository` in `database`, its tables created when missing. `log` reports each
 * slideshow the list leaves out because its document cannot be read.
 */
export function openSqliteRepository(
  database: DatabaseSync,
  log: (line: string) => void,
): LibraryRepository {
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
  const insertShareLink = statement(
    "INSERT INTO share_links (slideshow_id, token, created_at) VALUES (?, ?, ?)",
  );
  const deleteShareLink = statement("DELETE FROM share_links WHERE slideshow_id = ?");
  const findShareLink = statement(
    "SELECT token, created_at FROM share_links WHERE slideshow_id = ?",
  );
  const findSlideshowByShareToken = statement(
    `SELECT ${SLIDESHOW_COLUMNS} FROM slideshows
     WHERE id = (SELECT slideshow_id FROM share_links WHERE token = ?)`,
  );
  const findMusic = statement(
    "SELECT id, content_type, bytes, uploaded_at FROM music WHERE id = ?",
  );
  const insertMusic = statement(
    "INSERT INTO music (id, content_type, bytes, uploaded_at) VALUES (?, ?, ?, ?)",
  );
  const deleteMusic = statement("DELETE FROM music WHERE id = ?");
  const restartMusicGrace = statement("UPDATE music SET uploaded_at = ? WHERE id = ?");
  const findMusicBeats = statement("SELECT beats FROM music_beats WHERE music_id = ?");
  const putMusicBeats = statement(
    `INSERT INTO music_beats (music_id, beats) VALUES (?, ?)
       ON CONFLICT (music_id) DO UPDATE SET beats = excluded.beats`,
  );
  const deleteMusicBeats = statement("DELETE FROM music_beats WHERE music_id = ?");
  const findMusicLoudness = statement("SELECT loudness FROM music_loudness WHERE music_id = ?");
  const putMusicLoudness = statement(
    `INSERT INTO music_loudness (music_id, loudness) VALUES (?, ?)
       ON CONFLICT (music_id) DO UPDATE SET loudness = excluded.loudness`,
  );
  const deleteMusicLoudness = statement("DELETE FROM music_loudness WHERE music_id = ?");
  const musicReference = statement("SELECT 1 FROM document_music_ids WHERE music_id = ?");
  const unreferencedMusic = statement(
    `SELECT id FROM music WHERE uploaded_at < ? AND id NOT IN (SELECT music_id FROM document_music_ids)
     ORDER BY uploaded_at, id`,
  );
  const findPictureFocusOne = statement(
    "SELECT detector, focus FROM picture_focus WHERE asset_id = ?",
  );
  const putPictureFocusStatement = statement(
    `INSERT INTO picture_focus (asset_id, detector, focus, found_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (asset_id) DO UPDATE SET detector = excluded.detector, focus = excluded.focus,
         found_at = excluded.found_at
       WHERE excluded.detector >= picture_focus.detector`,
  );
  const deletePictureFocusStatement = statement("DELETE FROM picture_focus WHERE asset_id = ?");
  const pictureReference = statement("SELECT 1 FROM document_picture_asset_ids WHERE asset_id = ?");

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
    // One unreadable document (e.g. an older formatVersion) must not hide every other slideshow.
    listSlideshows: () =>
      listSlideshows.all().flatMap((row) => {
        try {
          return [slideshowOf(row)];
        } catch (error) {
          log(`slideshow ${String(row["id"])} left out of the list: ${(error as Error).message}`);
          return [];
        }
      }),
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
    share(id, { token, createdAt }) {
      insertShareLink.run(id, token, createdAt);
    },
    unshare(id) {
      deleteShareLink.run(id);
    },
    shareOf(id) {
      const row = findShareLink.get(id);
      return row === undefined
        ? undefined
        : { token: text(row, "token"), createdAt: integer(row, "created_at") };
    },
    slideshowByShareToken(token) {
      const row = findSlideshowByShareToken.get(token);
      return row === undefined ? undefined : slideshowOf(row);
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
      deleteMusicLoudness.run(id);
    },
    findMusicBeats(id) {
      const row = findMusicBeats.get(id);
      return row === undefined ? undefined : musicBeatsOf(row);
    },
    putMusicBeats(id, beats) {
      putMusicBeats.run(id, JSON.stringify(beats));
    },
    findMusicLoudness(id) {
      const row = findMusicLoudness.get(id);
      return row === undefined ? undefined : musicLoudnessOf(row);
    },
    putMusicLoudness(id, loudness) {
      putMusicLoudness.run(id, JSON.stringify(musicLoudnessToJson(loudness)));
    },
    restartMusicGrace(id, time) {
      restartMusicGrace.run(time, id);
    },
    isMusicReferenced: (id) => musicReference.get(id) !== undefined,
    unreferencedMusicUploadedBefore: (time) =>
      unreferencedMusic.all(time).map((row) => text(row, "id")),
    findPictureFocus(assetIds) {
      const found = new Map<string, StoredFocus>();
      for (const assetId of assetIds) {
        const row = findPictureFocusOne.get(assetId);
        if (row !== undefined) {
          found.set(assetId, storedFocusOf(row, assetId));
        }
      }
      return found;
    },
    putPictureFocus(id, stored, foundAt) {
      const info = putPictureFocusStatement.run(
        id,
        stored.detector,
        JSON.stringify(stored.focus),
        foundAt,
      );
      return info.changes > 0 ? "stored" : "newerKept";
    },
    isPictureReferenced: (id) => pictureReference.get(id) !== undefined,
    deletePictureFocus(id) {
      deletePictureFocusStatement.run(id);
    },
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

function musicLoudnessOf(row: Row): MusicLoudness {
  const stored = text(row, "loudness");
  try {
    // What the database holds was validated on the way in; reading it again fails loud on damage.
    return parseMusicLoudness(JSON.parse(stored));
  } catch (error) {
    throw new Error(
      `database column loudness holds ${stored}, not valid MusicLoudness: ${(error as Error).message}`,
      { cause: error },
    );
  }
}

function storedFocusOf(row: Row, assetId: string): StoredFocus {
  const stored = text(row, "focus");
  try {
    // What the database holds was validated on the way in; reading it again fails loud on damage.
    return readStoredFocus(
      { focus: JSON.parse(stored), detector: integer(row, "detector") },
      "picture_focus",
    );
  } catch (error) {
    throw new Error(
      `database row picture_focus for asset ${assetId} holds ${stored}, not valid StoredFocus: ${(error as Error).message}`,
      { cause: error },
    );
  }
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
