# Storage

The table is `share_links(slideshow_id PRIMARY KEY REFERENCES slideshows ON DELETE CASCADE,
token UNIQUE, created_at)`. The `LibraryRepository` contract gains `share(id, { token, createdAt })`,
`unshare(id)`, `shareOf(id)` and `slideshowByShareToken(token)`; the service makes the token.
The SQLite adapter turns foreign keys on for the cascade. The SQLite adapter and the in-memory fake run
the same contract suite.
