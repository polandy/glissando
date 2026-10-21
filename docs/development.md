# Development

## Run it

Needs Node 26.9.0 (see `engines` in `package.json`).

```sh
npm ci            # frozen install
npm run dev       # dev server on the LAN
npm run build     # static app in dist/
npm run verify    # everything CI runs
```

Fast unit tests: `npx vitest run --project unit <path>`. Browser tests and e2e run in the same
pinned image as CI: `scripts/browser-tests.sh`, `scripts/e2e.sh`.

## Build the server image

```sh
deploy/build-image.sh -t glissando:dev
docker run --rm -p 8080:8080 glissando:dev
```

The image is Caddy serving the built app plus the optional Immich proxy and library server
(`deploy/`, `server/`). Releases are cut by release-please: merging its PR publishes
`ghcr.io/polandy/glissando:<version>` and the GitHub Pages site.

Sample music (`dev-docs/library/SAMPLE_MUSIC.md`) is on by default; `build-image.sh` forwards
extra `docker build` flags, so turn it off or point it at a mirror with:

```sh
deploy/build-image.sh -t glissando:dev --build-arg GLISSANDO_SAMPLE_MUSIC=off
deploy/build-image.sh -t glissando:dev --build-arg GLISSANDO_SAMPLE_MUSIC_URL=https://example.test/music/
```

## Map

| Where       | What                                                    |
| ----------- | ------------------------------------------------------- |
| `src/`      | the app (Svelte 5) and the framework-free WebGL2 player |
| `server/`   | optional library, share and TV server                   |
| `deploy/`   | Dockerfile, Caddy config, image tests                   |
| `e2e/`      | end-to-end cases                                        |
| `dev-docs/` | scope, specs, ADRs, brand                               |

Before contributing read [`dev-docs/WORKFLOW.md`](../dev-docs/WORKFLOW.md) (branching, tests,
review) and [`dev-docs/CODING_PRINCIPLES.md`](../dev-docs/CODING_PRINCIPLES.md).
