# Timing

A transition runs during the **last `durationMs` of the slide carrying it**, so a slideshow
lasts exactly the sum of its slide durations (ADR-0002). The incoming slide's Ken Burns starts
with the transition and ends with its own slide. Transitions are eased `ease-in-out`.

The Ken Burns path (`cropAt` in `ken-burns.ts`) first holds the start and end frames inside the
picture — each crop stopped at the picture's border, its centre moved with it — and then runs
between those two crops: zoom and centre interpolated by the slide's easing. The crop's width
(crop-to-fit ÷ zoom) never exceeds the straight line between the end frames' widths, so a path
whose ends fit stays inside the picture all the way and never reaches a border on the way: no
edge stops the motion part-way, which would show as a sudden change of pan speed or direction.
The renderers and the picture editor's preview and playhead all draw this path. E2E-031 plays
a motion that starts past a picture's edge and checks, frame by seeked frame, that the view's
centre moves one way only.

## Video clips

The slide clock leads and a clip follows (`video-clip-plan.ts`, `video-clips.ts`). A video slide's
clip time is `max(0, startMs + slide time)`; the slide time is negative during the transition into
it, so the clip plays from the start of that transition, and a transition out keeps it playing. A
clip is opened `VIDEO_PRELOAD_MS` before that lead-in and released once out of range. Each frame
`follow` lets a playing clip that is off the clock by more than `VIDEO_RATE_TOLERANCE_MS` (60 ms)
catch up by playing 0.8× to 1.25× as fast, and seeks it only beyond `VIDEO_SEEK_DRIFT_MS` (2 s):
a seek mid-file waits for a keyframe and shows as a stutter. A stalled clip holds its last frame. Seeking the show, or a clip not yet playing, is a hard `seek`:
the poster shows until the frame is ready. The clip's sound is audible only for its slide's own
duration. The music's volume is multiplied each frame by `duckFactorAt` (`playlist-music.ts`).

Show time follows the clock from an anchor set when playing starts or resumes, **after** that
first frame is drawn, so the time it takes never shows as a jump in the motion. While playing,
every animation frame is drawn first, then `SlideRenderer.prepare` is called for each buffered
picture after the ones on screen: a bounded step of the work to draw it later, so the frame a
picture comes on screen pays nothing for it (ADR-0014). `prepare` rasterises a slide's card the
same way, so the card's own first frame pays nothing for it either.
