# Waiting and errors

- **Blocking overlay** (`BlockingOverlay`): a title and one line, always; e.g. "Creating
  slideshow …". With a progress it shows a bar instead of the spinner, optionally a note (the
  file name) and "Cancel".
- **Notice** (`Notice`): inline at the cause; lemon for warnings, coral for errors. Links in its
  text, optionally buttons below it and a ✕ that dismisses it.
- **Toast** (`Toast` + `toast/toaster.ts`): one at a time, bottom (right from 700 px viewport width), gone after
  6 s; an optional action and a close button. A new toast replaces the shown one. While the import wizard's
  bottom actions or the slideshow's selection bar are shown, it rises above them.
- **Dialog** (`Dialog`): a native modal dialog, only when the user must decide.
