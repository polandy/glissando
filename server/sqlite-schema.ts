/**
 * The repository's tables and views, each created when missing. Foreign keys are off in SQLite
 * unless a connection turns them on; share_links needs its cascade.
 */
export const SQLITE_SCHEMA = `
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
