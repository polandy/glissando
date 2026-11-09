# ESLint chain: minimatch override

`npm audit` flags `minimatch` 10.2.6 (via `eslint`, `@eslint/config-array` and
`typescript-eslint`). The fixed release is 11.0.5; eslint and typescript-eslint have no release
that depends on it yet. `package.json` therefore pins it with an exact override:

```json
"overrides": { "minimatch": "11.0.5" }
```

## What changes

- `minimatch` 10.2.6 → 11.0.5 for every consumer in the dev tool chain (dev only, never shipped).
- The lockfile gains `@isaacs/nonrecursive-glob-match` 1.1.0 (a new dependency of minimatch 11) and a newer `brace-expansion` floor.
- minimatch 11 needs Node `20 || >=22`; the repo pins Node 26.9.0.

## Verify

1. `npm ls minimatch` shows 11.0.5 everywhere, each line `deduped` or `overridden`.
2. `npm audit` no longer lists `minimatch`, `eslint` or `typescript-eslint`.
3. `npx eslint . -f json` lists the same files before and after, with zero errors and warnings.
4. `npm run verify` is green.

## Rollback

Remove the `overrides` block from `package.json` and run `npm install`. Drop the override once
eslint and typescript-eslint depend on minimatch 11.0.5 or later themselves.
