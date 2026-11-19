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

A layer with no visible card costs the draw no card pass: no framebuffer switch and no clear of the
full viewport. The transition shader samples a transparent one-texel texture for it instead, so a
picture slide is drawn in one draw call. Only a layer whose card is showing is rasterised into its
screen-sized target (ADR-0032).

## A late picture

A picture that is not loaded when its slide comes on screen holds the show (ADR-0057): the clock
stops, the music pauses, the last frame drawn stays on screen and the player reports `waiting`.
Once the pictures on screen are loaded, the show resumes from the same time, the music with it,
and `playing` follows; no picture is skipped or cut short. A picture that fails to load at its
turn stops the player with an error. Preparing a server show a few pictures at a time, with a
pre-roll (ADR-0058), keeps this rare.

## Music

The show clock leads the music too (`playlist-music.ts`). Playing, resuming, seeking the show or
waiting for a picture start each heard song at `trackSecondsAt` of the show time. A song that
already stands within `MUSIC_START_TOLERANCE_MS` (50 ms) of that place, as one resumed after a
hold does, starts
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

Per animation frame it also counts the draw, program, framebuffer and texture-delete calls and,
where the browser has `EXT_disjoint_timer_query_webgl2`, the frame's GPU time. Every gap over
33 ms lists the work of the frame drawn right before it (`droppedFrameWork`) and counts as at a
slide boundary when it starts within 400 ms of a picture's texture allocation.

**The reference is the owner's host, headless, on its integrated GPU** (`--browser host --gpu
amd`, the default): it renders on real hardware without a display. Performance work aims at
**60 Hz**, a 16.7 ms frame; a faster display is targeted only once a device with one is measured.
A change made for speed is measured first, on the reference and, for anything about memory or a
weak GPU, on a phone.

- **A software renderer measures nothing about Glissando.** The pinned CI image has no GPU:
  Chromium draws with SwiftShader, headless Firefox gets no WebGL2 context and falls back to the
  DOM renderer. Vulkan (`--gpu nvidia`) can fall back to SwiftShader headless as well. The probe
  reads the page's WebGL2 renderer before playing and stops (exit 3) on a software or missing
  one; `--allow-software-gl` measures anyway, for a functional run. WebKit always reports
  "Apple GPU", whatever renders.
- **A show that did not play measures an idle page**: the summary's `warnings` say when no
  picture was prepared after play or the music never played.
- **A gap that ends as a decoded picture arrives** (`workerMessages` in) is the decode, not the
  draw: the frame before it draws as little as any other. The decode worker reads pixels from a
  CPU-backed canvas for that reason (ADR-0014).
- **Headless Chrome on the integrated GPU can refuse to play a clip** with hardware decoding;
  `--software-video-decode` decodes in software.
