# The image

- The final stage carries Node (pinned by digest, the version of `.node-version`) and the Caddy
  binary copied from the pinned Caddy image; the service is `/usr/local/lib/glissando/`, and
  `/data` is owned by the container's user, so a named volume mounted there is writable.
- The entrypoint starts the service when `GLISSANDO_DATA_DIR` is set and Immich is on (the
  library route `deploy/library-on.caddy`), else the route `deploy/library-off.caddy` answers 404.
  `GLISSANDO_DATA_DIR` without `IMMICH_URL` stops the start with a message naming both. It waits
  on both processes and exits when either exits, with that process's status; `docker stop`
  (SIGTERM) ends both and exits 0.
- `deploy/test-image-library.sh`, run by `deploy/test-image.sh`, checks: the discovery answers
  with a data volume and 404 without; a slideshow created survives a container restart on the
  same volume; a `PUT` with a stale revision gets 412, one not `application/json` 415; a body over
  the document limit gets 413; a slideshow shared by link plays (share_link/END_TO_END.md);
  `docker stop` exits 0, a killed service stops the container with its status.
