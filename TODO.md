# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] Work through the code-review findings — `TODO-code-review.md`, MED first, one PR per item or area (2026-11-03)
- [ ] Keep the Docker healthcheck out of the access log — Caddy logs every check (~2,900 lines/day at a 30 s interval) although the homelab already monitors health via Docker's health state; add a `/healthz` route in deploy/Caddyfile answering 200 with `log_skip` and point the homelab healthcheck at it after the release. Also check why ordinary requests (e.g. `/`) are logged by the `share` logger (`http.log.access.share`) instead of the access log with `credential_log_filters` (2026-10-12)
