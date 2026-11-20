# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Cap the Ken-Burns zoom by detected image sharpness — later (owner: not now); the pure score and its map to a max zoom exist (`src/compose/sharpness-zoom-cap.ts`); left: measure each picture's subject at its on-screen size, store the score, calibrate the floor on real-size crops and apply the cap in `autoKenBurns`, so a soft subject or image is zoomed less and its softness shows less (2026-11-13)
- [ ] Migrate older server documents instead of refusing them: the server lists only `SERVER_DOCUMENT_FORMAT_VERSION` 7 and logs older ones as unreadable; per ADR-0059 a stored document of any older version should open through a migration chain, as .glissando files do (ADR-0054) (2026-11-20)
