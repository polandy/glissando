# Step 1 — the picture import

`PictureImport` processes the picked files one at a time (memory stays bounded on phones) and
publishes a state with the Svelte store contract:

- `total` counts accepted picture files, `done` the processed ones (stored or unreadable), so
  progress "done of total" reaches total. More files can be added at any time; they append.
- `pictures` lists the stored pictures in capture-date order as they arrive.
- **Storage full** (`QuotaExceededError`): the import stops, keeps what is stored, drops the
  remaining files from `total` and reports `storageFull`. Adding files again tries again.
- `skipped` names each skipped file with its reason (_unsupported_, _unreadable_, _not
  downloaded_, _alreadyIn_, _chosenTwice_); a duplicate counts as done.
- **Cancel** stops after the file in flight and clears the state.
- Any other error ends the import as `failed`; it is never swallowed: `settled()` rejects with
  `PictureImportFailedError` (the error as its `cause`), which the app logs and shows as the
  failed state only. The error of a file cancelled in flight fails nothing and rejects as itself,
  so the app reports it. A failed import takes no more files until it is cancelled, which starts
  it over.
