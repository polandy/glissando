# ADR-0035: `<video>` in the player, WebCodecs in the export, and the clip's sound ducks the music

**Status:** accepted

## Context

A clip must play in the player (WebGL2 and the DOM fallback), in the MP4 export (ADR-0015) and in
the HTML export (ADR-0017), with its sound next to the slideshow's music (ADR-0023). The player
runs on every supported browser including iPhone Safari and TV browsers; the export runs only
where WebCodecs exists.

## Decision

- **Player:** a `<video>` element per clip, opened through an injected port (`openVideo`), following
  the slide clock; its frames are uploaded to the slide's texture every frame (WebGL) or shown
  directly (DOM). The slide clock leads; the clip is seeked to catch up and holds its last frame
  when it stalls.
- **Export:** mediabunny demuxes and decodes the clip with WebCodecs, frame accurate at the export's
  frame times; the clip's audio is decoded into the same offline mix as the music.
- **Sound:** a clip's sound is on by default; the music multiplies by a duck factor of 0.15 inside
  such a slide with 400 ms ramps (`duckFactorAt`, a pure function shared by the player and the
  export mix). The user can turn a clip's sound off or keep the music at full volume.

## Options weighed

- _WebCodecs everywhere_ — rejected: missing or partial on Safari and TV browsers, and audio output
  would need its own decoder and A/V sync; `<video>` already gives both.
- _`<video>` in the export too_ — rejected: it cannot be stepped frame accurately; the export must
  not depend on playback speed.
- _The music pauses during a clip_ — rejected: the slideshow's timing follows the music (ADR-0022),
  a pause would shift every later slide.
- _Clip sound off by default_ — rejected: a clip is chosen because of its sound more often than not;
  turning it off is one tap.

## Consequences

- Two decode paths (player, export) must agree on which frame a time shows; the export's tests pin it.
- Safari plays clip sound only after the first user gesture, which the play button is.
