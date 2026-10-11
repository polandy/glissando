# ADR-0026: Modules the Vite config loads import with explicit file extensions

**Status:** accepted

## Context

The build plugins render pages at build time from the app's own code: the share page plugin
calls `sharePageHtml` and the catalogues, the theme plugin reads the stored theme's names. So
`vite.config.ts` reaches into `src/`. The rest of `src/` imports without file extensions, which
the bundler resolves. Vite bundles the config and warns about every import its future default,
`configLoader: 'native'` (plain Node type stripping), could not load: an extensionless import,
a directory index. With the share page in the graph the warning ran to 192 lines, printed twice,
in front of every Vitest and Vite run.

## Decision

- **Every module in the config's import graph imports with an explicit `.ts` extension** and
  never through a directory index. The rest of `src/` keeps extensionless imports.
- **The graph is kept small**: `src/html-export/page.ts` imports the caption font name from
  `player/caption-layout.ts` rather than the player's index, which would pull the whole engine in.
- **A unit test guards it** (`build/vite-config-graph.test.ts`): it loads the config through
  Vite's `loadConfigFromFile` with the check switched on and fails on the warning. It first
  proves the check is live on a fixture config that imports without an extension.

## Options weighed

- **Set `VITE_CONFIG_NATIVE_IGNORE_WARNING`**: one line, but it hides the warning and leaves the
  config unloadable by the native loader once that becomes the default.
- **Explicit extensions across all of `src/`**: one convention everywhere, but a sweep of about
  2,700 imports in hundreds of files that collides with every open branch, for no behaviour.
- **Load the share page's modules through Vite's module runner (`runnerImport`) inside the
  plugin**: keeps `src/` out of the config graph, but starts a second Vite instance during the
  build and still leaves the theme and licence modules in the graph.

## Consequences

- About 35 modules in `src/` (the theme, the share page, the catalogues, a few player files)
  use explicit extensions while their neighbours do not. A module that joins the config graph
  without them turns the guard red with the exact import to fix.
- The config is ready for `configLoader: 'native'`.
