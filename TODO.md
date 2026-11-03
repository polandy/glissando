# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Check the Immich proxy lets the GPS lookup through — `deploy/immich-proxy.caddy` may refuse a bare `GET api/assets/<uuid>`, so `gps()` (`src/immich/http-immich-client.ts`, used by the Immich import) would get a 403 when deployed and Immich pictures no place; unconfirmed (2026-11-03)
