# Waiting and errors

- **Blocking overlay** (`BlockingOverlay`): a title and one line, always; e.g. "Creating
  slideshow …". With a progress it shows a bar instead of the spinner, optionally a note (the
  file name) and "Cancel".
- **Notice** (`Notice`): inline at the cause; lemon for warnings, coral for errors. Links in its
  text, optionally buttons below it and a ✕ that dismisses it.
- **Toast** (`Toast` + `toast/toaster.ts`): one at a time, bottom (right from 700 px viewport width), gone after
  6 s; an optional action and a close button. A new toast replaces the shown one. While the import wizard's
  bottom actions or the slideshow's selection bar are shown, it rises above them.
  A toast about one screen (`route`) ends once the app leaves that screen; one saying why the app
  moved, such as "Slideshow deleted", stays.
- **Dialog** (`Dialog`): a native modal dialog, only when the user must decide.
- **Export failures**: a video or web page that cannot be created shows a mapped sentence with a way out
  (`export-errors/describe-export-failure.ts`), never the error's own message; that goes to the console
  and a "Show details" fold (`scripts/no-raw-error-text.sh` guards it).
