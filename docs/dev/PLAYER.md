# Player engine

`src/player/` plays a slideshow: framework-free TypeScript plus WebGL2, never importing Svelte
(CODING_PRINCIPLES §7). The app imports only `src/player/index.ts`.

| Section                                    | What it covers                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| [Slideshow JSON](player/SLIDESHOW_JSON.md) | The wire contract and its fields                                               |
| [Video slides](player/VIDEO_SLIDES.md)     | A picture slide that plays a clip: format, timing, sound and ducking           |
| [Timing](player/TIMING.md)                 | Transitions, the Ken Burns path and show time                                  |
| [Player API](player/PLAYER_API.md)         | `createPlayer`, `createBrowserPlayer`, `createFramePlayer` and their behaviour |
| [Captions](player/CAPTIONS.md)             | A caption's look and layout                                                    |
| [Looks](player/LOOKS.md)                   | A slideshow's colour grade: the table, the maths, what is graded               |
| [Renderers](player/RENDERERS.md)           | WebGL2 and the DOM fallback                                                    |
| [Tests](player/TESTS.md)                   | Unit tests and the browser test engines                                        |
