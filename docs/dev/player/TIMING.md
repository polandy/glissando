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

The slide clock leads and a clip follows (`video-clip-plan.ts`, `video-clips.ts`). The clip plan
places each clip on the timeline's own `slideSpans`, so a clip is on screen exactly while its slide
is drawn. A video slide's
clip time is `startMs + slide time`, clamped to `endMs`; the slide time is negative during the
transition into it, so the clip plays from the start of that transition, and a transition out keeps
it playing. A file with less footage before `startMs` than that lead-in **holds** its first frame
(file time 0) while its slide fades in and starts playing once the clock reaches it — so every
clip reaches `endMs` exactly when its slide ends and never freezes before it. A clip is opened `VIDEO_PRELOAD_MS` before that lead-in and released once out
of range. A clip's `<video>` is always muted; each frame `follow` lets a playing clip that is off
the clock by more than `VIDEO_RATE_TOLERANCE_MS` (60 ms) catch up by playing 0.8× to 1.25× as fast,
and a clip off by more than `VIDEO_SEEK_DRIFT_MS` (2 s) is seeked to the clock: a seek mid-file waits for
a keyframe and shows as a stutter. A stalled clip holds its last frame. Seeking the show, or a clip
not yet playing, is a hard `seek`: the poster shows until the frame is ready — except that starting
playback leaves a clip already within `VIDEO_START_TOLERANCE_MS` (250 ms) of its place alone rather
than seeking it, since `follow` mends a gap that small on its own and a seek right at the start is
a visible hitch. The clip's sound is a decoded buffer on the `AudioContext` clock, started at the
clip time and restarted on seek, resume, or when it drifts from the slide clock by more than
`CLIP_SOUND_RESYNC_MS` (`ClipSoundTrack`); it is audible from its slide's start
until its slide ends. The music's volume is multiplied each frame by `duckFactorAt`
(`playlist-music.ts`), whose spans start where each clip's sound does.

Show time follows the clock from an anchor set when playing starts or resumes, **after** that
first frame is drawn, so the time it takes never shows as a jump in the motion. While playing,
every animation frame is drawn first, then `SlideRenderer.prepare` is called for each buffered
picture after the ones on screen: a bounded step of the work to draw it later, so the frame a
picture comes on screen pays nothing for it (ADR-0014). `prepare` rasterises a slide's card the
same way, so the card's own first frame pays nothing for it either.

## A late picture

A picture that is not loaded when its slide comes on screen does not stop the show (ADR-0057):
the clock and the music run on, the last frame drawn stays on screen and the player reports
`waiting`. The picture is drawn from the frame it arrives in, for the rest of its slot, or never
if its slot has passed by then; `playing` follows the first frame drawn again. Each frame
meanwhile asks for the pictures on screen and the next ones, so the loading follows the clock.
Only starting, resuming and seeking wait for their pictures before the music starts, since
nothing is on screen to hold. A picture that fails to load at its turn stops the player with an
error.

## Music

The show clock leads the music too (`playlist-music.ts`). Playing, resuming or seeking the show
starts each heard song at `trackSecondsAt` of the show time. A song that already stands within
`MUSIC_START_TOLERANCE_MS` (50 ms) of that place, as one resumed after a pause does, starts
without a seek (`platform.ts`): the seek itself would be heard as a gap while the song buffers
again. Each frame,
`follow` then compares every heard song's position with that place and seeks it there once it is
off by more than `MUSIC_RESYNC_MS` (150 ms), so a stall in the song never leaves the beat-aligned
picture changes (ADR-0021, ADR-0046) off the beat for the rest of it. The position is read only
while the song really plays — not while it starts up, seeks, stalls or is paused
(`playingSecondsOf`, shared with the clips) — so a seek never chases its own start-up. The seek
is plain: no change of speed, which would warble the music, and no fade, since it follows a stall
that was already heard.

Only a start or a stall since the last reading lets a song be seeked (ADR-0056): a song that falls
behind while it plays on has a slow audio clock, which a seek cannot outrun. The drift at the first
reading after a seek is where that seek landed; the song counts as on its place there until it
drifts on from it, or back onto the clock. So a device busy preparing pictures, whose seeks land
late, gets one seek per stall instead of one per frame.

## Measuring stutter

`scripts/probe-playback-stutter/probe.mjs` plays a `.glissando` file or a server slideshow in a real
browser and records what a viewer would notice: animation-frame gaps, main-thread blocks, texture
uploads, the music element's pauses, seeks and stalls. It can starve the CPU, pin the browser to
cores and make the pictures of a server slideshow arrive late, so a stutter is measured before and
after a change instead of listened for. Its header lists the options.
