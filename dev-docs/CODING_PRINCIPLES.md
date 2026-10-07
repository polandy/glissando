# CODING_PRINCIPLES.md — Glissando

**Status:** Binding for all code in this project.
**Precedence:** These principles > convenience. A deviation needs a written note in the PR.

Stack-specific conventions are in §7; the stack itself is ADR-0001.

## 1. Non-negotiables

1. **Test-first.** Every behaviour starts as a failing test that reads as its specification.
   Red → green (simplest passing code) → refactor. No production logic without a driving test.
2. **Readability over cleverness.** If a construct needs explaining, rewrite it before commenting.
3. **English everywhere** — identifiers, tests, comments, commits, docs.
4. **Comments justify _why_, never _what_.** They describe the current state only — no history,
   no provenance, no commented-out code; git holds the past.
5. **Clear responsibilities.** Every module has one reason to exist and one to change; dependencies
   point inward, never sideways into a sibling's internals.
6. **No magic strings or numbers** (§4).
7. **Minimal exposure.** Private by default; export deliberately.
8. **Descriptive names.** A longer clear name beats a short cryptic one.
9. **YAGNI.** Build what the current milestone needs; leave doors open without paying for them.
10. **Consistency.** Follow the existing pattern over personal preference.
11. **Delete dead code.** Nothing is kept "for later" — an unused API is complexity, not
    future-proofing.
12. **Terse comments.** The non-obvious _what_ plus the one _why_. A comment that would vanish once
    the value is extracted into a well-named variable or function should be that name. Rationale
    that lives in an ADR is a pointer (`see ADR-00NN`), never repeated inline.

## 2. Tests

- **Naming as specification**: a failing test's name alone says which rule broke; carry the spec
  id where there is one.
- **A bug fix starts with a failing test** that reproduces the bug.
- **Failure paths** are tested wherever code enforces a safety or correctness rule, not just the
  happy path.
- **Table-driven** cases for domain logic; **behaviour, not implementation** — assert observable
  outcomes through the public API so tests survive refactors.
- **Pyramid**: most tests are pure unit tests with no I/O; integration tests hit real in-memory
  stores, never mocks of the database; e2e covers user flows.
- **No mocking frameworks** — hand-written fakes behind small interfaces. The one exception to
  faking is the process boundary itself: the adapter that execs a real process is tested against
  the real thing (skipping when it is missing), because a fake there would test nothing.
- **Determinism** — a test may only fail for the behaviour:
  - no sleeps, fixed waits, or polling for an effect that only probably lands;
  - clock, randomness and IDs are injected; tests never read the real clock;
  - if a test can only pass by waiting, the production code is missing a seam (a settled state,
    a completion signal) — fix it there, never with a longer wait;
  - an assertion that something did _not_ happen needs a positive signal, or it is false-green;
  - **prove it can fail**: break the behaviour and watch exactly that case go red.
- **Motion is waited on, never timed** — e2e runs with reduced motion; a spec about the motion
  waits on its end state.
- **Coverage is a smoke detector, not a goal.** A count says how many promises have no test,
  never how many deserve one.
- **E2e follows the owner's OK**: unit/integration tests are test-first; the e2e case for a UI
  change is written after the owner confirmed the built change, so it locks in agreed behaviour
  rather than a guess. It goes into the feature's own PR.

## 3. Architecture

- **Testability is an architectural acceptance criterion.** Where a behaviour lands is decided
  by where its driving test can live: decisions in pure functions, I/O at thin edges, every
  external effect behind a small consumer-side interface with a fake.
- **Ports & adapters + dependency injection.** Use-cases receive their collaborators; only the
  composition root wires real implementations. No globals, no module-level singletons.
- **Framework-agnostic domain.** Domain code imports no UI framework, router or I/O library.
- **No ordering races in production code.** Behaviour never depends on which of two async
  things completes first — make it a _state_ (latch, settled flag, replay on subscribe), not a
  one-shot event.
- **Fail loud.** Validate at boundaries, throw on invalid state; no empty `catch`, no catch that
  turns an unexpected error into a user message. Never discard an error that matters — log it at
  minimum, always for state-persisting calls. Check errors by identity/type, never by matching
  their message.
- **Actionable error messages**: name the exact key, the bad value and what to set instead, not
  just what went wrong.
- **Unknown config keys are rejected, never ignored** — a typo or a retired key must fail the load
  rather than leave the app running with a setting the operator believes is in effect.
- **Persisted state is written atomically** (temp file + rename).
- **Strict typing.** No `any` (use `unknown` + narrowing); make illegal states unrepresentable.
- **Immutability and pure functions** where reasonable.
- **Config** only via environment variables, parsed once at startup into a typed, validated
  object.
- **Security by default.** Least privilege, validate all external input, no secrets in code or
  logs.

## 4. No magic strings or numbers

A literal that is _compared against_, _switched on_, or repeated across files is named once as a
constant, next to the concept it names, in the module that owns it — never a `constants` grab-bag.

Exceptions: a test that states its expectation literally on purpose (so a wrong constant shows
as a mismatch); a serialization key that _is_ the wire contract.

Colours, type, icons and shape come from the design-token tables only — no raw value, not even
as a fallback.

## 5. Dependencies

- **Standard library and platform APIs first.** A new dependency needs a one-line justification
  and its transitive cost weighed.
- **Exact versions only**, lockfile committed, installs frozen in CI and builds.
- **Everything resolves to an exact version verified by hash** — container images by `@sha256:`
  digest, GitHub Actions by full commit SHA with the tag as a comment. Never a bare tag.
- Upgrades are deliberate and land with their lockfile change in the same commit.

## 6. Workflow

- Conventional Commits, imperative, ≤ 72-char subject, body explains _why_; type matches the
  user-facing impact (release-please derives version and changelog from it).
- Each commit compiles and passes tests.
- **Output hygiene**: a session's output is re-read on every later turn — targeted edits, never
  whole-file rewrites; a repeated analysis is a script under `scripts/`; mechanical sessions run
  at lower reasoning effort.
- Formatting is a tool's job, not a review topic; a post-edit hook formats touched files.
- **Definition of Done**: tests green, lint clean, docs updated, no TODO without an issue or
  `TODO.md` reference.

## 7. Stack conventions (TypeScript, Svelte 5, Vite)

- **Local first**: logic runs in the browser and works offline; a server is never required
  (see `dev-docs/SCOPE.md`).
- **The player engine** (`src/player/`) is framework-free TypeScript plus WebGL2; it never imports
  Svelte. Svelte components live in `src/app/` and drive the engine through its public API.
- **Strict TypeScript** (`tsconfig.json`: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`); `any` is a lint error.
- **Tooling**: Prettier formats, ESLint (typescript-eslint strict + eslint-plugin-svelte) lints,
  `svelte-check` type-checks, Vitest runs unit tests next to the code as `*.test.ts`.
- **npm** with `package-lock.json` (integrity hashes) and `npm ci`; Node pinned in `.node-version`.
- **UI copy** comes from the message catalogue (German and English), never a literal in a
  component.
- **Brand assets** are generated by `scripts/brand/build.sh` from a hash-verified font source;
  the outputs are committed, never edited by hand.

_Amendments to this document are themselves test-first: propose, discuss, commit._
