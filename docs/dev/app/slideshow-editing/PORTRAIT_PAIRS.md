# Portrait pairs in the picture strip

Mockup: https://claude.ai/artifact/64QKfPGncuwB5Zf2mDtpAi (variant B and the split flow).
Pairing itself: ADR-0028 and [picture-editor/LAYOUT.md](../picture-editor/LAYOUT.md).

## Showing a pair

The two tiles of a pair sit on one plate (`--gl-pair-plate`, its edge `--gl-pair-edge`) that
bridges the gap between them and stops short of the middle of the gap to the next row, so two
rows' plates never touch. Where a row break or a chapter tile cuts the pair, each half closes
with a dashed edge (`pair-cuts.ts` marks both tiles `data-pair-cut`, measured on mount and
whenever the strip resizes).

## Splitting and pairing again

- A scissors button "Split pictures 1 and 2" sits on the bridge (at the first tile's end when
  the pair is cut). It shows while the mouse is over either tile (over the first only when a
  chapter tile sits between them) and while either picture of the pair is selected; it is focusable only while shown.
- With one picture selected, the selection bar offers "Split" for a picture of a pair, and
  "Pair again" (narrow: "Pair") for an alone picture that would pair without its mark
  (`pair-action.ts`).
- Splitting marks the pair's second picture alone (`PairEditor.split`): pairing is greedy from
  the start, so exactly this one pair comes apart. A toast "Pictures 1 and 2 split" offers
  "Undo".
- Pair again clears the mark, with a toast "Pictures 1 and 2 paired again" and "Undo". Pairing
  greedily, the pictures after it may pair up anew: a pair it takes a picture from comes apart.
  Only then the toast names it — "Pictures 3 and 4 paired again, 4 and 5 split" — and when a
  chain of later pairs changes, it names the first and ends in "…" (`pairsComingApart`, which
  compares the slide units before and after). Undo restores every one of them at once.
- Toggling "Always alone" in the picture editor supersedes a pending undo of either.
- The phone bar dispatches `actionlinesbalanced` on its action row after a width change has
  rebalanced it, a signal tests wait for.
- E2E-134 splits a pair by its scissors and by the bar, undoes, reloads and pairs it again.
- E2E-135 marks a pair's first picture always alone, pairs it again, reads the toast naming the
  later pair that came apart, and undoes it.
