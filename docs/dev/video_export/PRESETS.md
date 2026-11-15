# Presets

16:9, 30 frames per second, a keyframe every 2 s (60 frames), `hardwareAcceleration: "no-preference"`.

| Preset (id)          | Size        | Video codec   | Video bitrate | Label (de / en)                                                  |
| -------------------- | ----------- | ------------- | ------------- | ---------------------------------------------------------------- |
| Klein / Small (720p) | 1280 × 720  | `avc1.640028` | 4 Mbit/s      | Zum Verschicken / For sending                                    |
| Standard (1080p)     | 1920 × 1080 | `avc1.640028` | 8 Mbit/s      | Für Rechner, Telefon und Tablet / For computer, phone and tablet |
| Groß / Large (4k)    | 3840 × 2160 | `avc1.640033` | 24 Mbit/s     | Für den Fernseher / For the TV                                   |

Audio: AAC-LC (`mp4a.40.2`), 48 kHz, stereo, 160 kbit/s; where `AudioEncoder` refuses that, Opus
(`opus`) with the same values. A slideshow without music has no audio track.

The size shown beside a preset is `(video + audio bitrate) × duration / 8`, "ca. 347 MB".
