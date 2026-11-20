# ADR-0059: The library and the server database migrate like .glissando files

**Status:** accepted

## Context

ADR-0054 keeps every .glissando file version readable. The data Glissando stores itself was not
covered: each IndexedDB schema bump dropped every store, so a library on a device started empty,
and the server's SQLite database had no version at all, so a later change could not tell which
shape it was reading. The owner extended the backward-compatibility rule to both.

## Options

1. **Keep dropping the library on a bump.** No migration code, but every device loses its
   slideshows with an update.
2. **Export and re-import around an update.** No schema code, but it needs the user and a full
   copy of all media.
3. **A chain of steps keyed on the stored version**, as ADR-0054 does for files: each schema
   version adds one step that rewrites the data from the version before, inside the upgrade.

## Decision

Option 3, for both stores.

- **IndexedDB** (`indexeddb-schema.ts`): `upgradeLibraryDatabase` gets `event.oldVersion`. A new
  library gets the current stores; one at `OLDEST_MIGRATABLE_SCHEMA_VERSION` (8) or newer runs
  the steps after its version; an older one is refused with `UnmigratableLibraryError` and left
  untouched, and the app shows that its storage is unavailable. `SCHEMA_VERSION` is the oldest
  version plus the number of steps, so a bump is a step.
- **SQLite** (`server/sqlite-schema.ts`): the schema version lives in `PRAGMA user_version`
  (`SQLITE_SCHEMA_VERSION`, 1). A database from before the stamp holds version 1's tables and is
  stamped on open; a newer version is refused with `NewerSqliteSchemaError`, untouched. A
  change to the tables adds a step from the previous version and raises the constant.

## Consequences

- An update never deletes stored data. A step must leave exactly the shape the current stores
  get when created, and each step comes with a test that upgrades a library holding records.
- A library at schema version 7 or older, from before this rule, does not open; it is deleted by
  hand. Raising `OLDEST_MIGRATABLE_SCHEMA_VERSION` needs an owner decision.
- An older server document version inside the database is still refused per document
  (`SERVER_DOCUMENT_FORMAT_VERSION`); migrating it is open work in `TODO.md`.
