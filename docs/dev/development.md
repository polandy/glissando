# Development

## Run it

Needs Node >=26.9.0 <27 (see `engines` in `package.json`).

```sh
npm ci            # frozen install
npm run dev       # dev server on the LAN
npm run build     # static app in dist/
npm run verify    # everything CI runs; steps run in parallel, the unit tests last and alone
```

Fast unit tests: `npx vitest run --project unit <path>`. Browser tests and e2e run in the same
pinned image as CI: `scripts/browser-tests.sh`, `scripts/e2e.sh`.

## Dependency and security upkeep

Dependabot opens weekly update PRs for npm, GitHub Actions and the base images in
`deploy/Dockerfile`. `engines.node` in `package.json` is the range `>=26.9.0 <27`; minor and patch
Node bumps stay inside it, and a new Node major is bumped by hand: `engines.node`, `.node-version`
and both `node` stages of the Dockerfile together (`build/node-version.test.ts` checks them).
The `security-scan` workflow
runs weekly (and on demand): `npm audit` and a Trivy filesystem scan. Both only report in the job
log; neither gates a PR.

## Build the server image

```sh
deploy/build-image.sh -t glissando:dev
docker run --rm -p 8080:8080 glissando:dev
```

The image is Caddy serving the built app plus the optional Immich proxy and library server
(`deploy/`, `server/`). Releases are cut by release-please: merging its PR publishes
`ghcr.io/polandy/glissando:<version>` and the GitHub Pages site.

Sample music (`docs/dev/library/SAMPLE_MUSIC.md`) is on by default; `build-image.sh` forwards
extra `docker build` flags, so turn it off or point it at a mirror with:

```sh
deploy/build-image.sh -t glissando:dev --build-arg GLISSANDO_SAMPLE_MUSIC=off
deploy/build-image.sh -t glissando:dev --build-arg GLISSANDO_SAMPLE_MUSIC_URL=https://example.test/music/
```

## Regenerate the bundled place names

`public/places/cities15000.tsv` (trip chapters' offline place lookup, ADR-0043) is generated,
committed output, never hand-edited:

```sh
scripts/places/build.sh
```

It downloads GeoNames' `cities15000` dump, checks it against a hash recorded in the script, and
writes the reduced TSV; a changed dump fails the build with how to review and update that hash.

## Map

| Where       | What                                                    |
| ----------- | ------------------------------------------------------- |
| `src/`      | the app (Svelte 5) and the framework-free WebGL2 player |
| `server/`   | optional library, share and TV server                   |
| `deploy/`   | Dockerfile, Caddy config, image tests                   |
| `e2e/`      | end-to-end cases                                        |
| `docs/dev/` | scope, specs, ADRs, brand                               |

Before contributing read [`docs/dev/WORKFLOW.md`](WORKFLOW.md) (branching, tests,
review) and [`docs/dev/CODING_PRINCIPLES.md`](CODING_PRINCIPLES.md).
