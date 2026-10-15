# Title card picture colours

Each stored picture carries two colours, worked out once when it is added (ADR-0033):
`veil`, a dark, muted tone of the picture to tint a veil, and `accent`, a light, clearer tone
for a colour ground. `pictureColours` is pure: it takes the pixels of the stored, downscaled
picture, sampled to at most 64 × 64, and returns both as `#RRGGBB`.

1. Each pixel goes to OKLCH. Pixels with a lightness below 0.08 or above 0.97 are skipped.
2. The hues go into 24 bins of 15°, each pixel weighted by its chroma, so grey counts little.
3. The **dominant** hue is the bin whose weight, added to its two neighbours', is largest. Its
   hue is the weighted circular mean over those three bins, its chroma their weighted mean
   chroma. A picture whose total weight is below 0.02 per sampled pixel counts as grey: chroma
   0, hue 0.
4. The **second** hue is found the same way among the bins at least 60° from the dominant
   hue. It counts only if its weight is at least a quarter of the dominant's. Otherwise it is
   the dominant hue.
5. `veil` = OKLCH(0.27, min(chroma, 0.05), dominant hue). `accent` = OKLCH(0.80,
   min(chroma × 1.2, 0.12), second hue). A colour outside sRGB loses chroma until it fits.
