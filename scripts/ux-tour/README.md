# UX screenshot tour

Captures every reachable screen of the built app at phone (390×844, touch, 2×) and desktop
(1280×800) widths, light theme, with synthetic pictures and a generated WAV. A capture aid for
UX reviews (`dev-docs/UX_BACKLOG.md`), not part of `npm run verify`.

```
npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort &
node scripts/ux-tour/tour.mjs phone      # or: desktop
```

Shots land in `scripts/ux-tour/shots/` (ignored by git) or in `$UX_TOUR_OUT`. `exif.mjs` is a
bundled copy of `src/import/testing/synthetic-jpeg.ts`; rebuild it if that file changes.
