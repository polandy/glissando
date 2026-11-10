# Todo / roadmap

One line per item, newest at the end. A finished item is deleted.

## Open

- [ ] E2E-083 flaked once in CI WebKit (PR #325, run 42712513385): after the forced `clickSwitch` on the Mood sheet's "Folgt der Energie der Musik" (click done, 166 ms after "scrolling into view"), the switch stayed unchecked for 5 s; 34 local WebKit runs pass, also at 2 CPUs × 4 workers — find whether the forced click lands off the scrolled input or the edit is lost (2026-11-09)
