# Capabilities

When the sheet opens, the export asks the browser, never a user-agent string:

- `VideoEncoder.isConfigSupported` for each preset's exact config; a refused preset is greyed out
  with "Kann dieses Gerät nicht kodieren". The default is 1080p, else the largest available.
- `AudioEncoder.isConfigSupported` for AAC, then Opus.
- A video slide's clip is decoded with WebCodecs through mediabunny. Before the presets are
  offered the sheet opens each clip file and asks `canDecode()` of its video track (and of its
  sound track when the clip is mixed in); the first refusal ends in the notice "Clip n cannot be
  exported." (n counts the show's video slides from 1), so nothing fails late.
- Unsupported as a whole (the sheet explains only, no presets): no `VideoEncoder`, no WebGL2, no
  preset available, or audio to mix (music or a clip with sound) but neither AAC nor Opus. Copy: "Dieser Browser kann keine Videos
  erstellen. Dafür braucht Glissando WebCodecs. Es geht in aktuellem Chrome, Edge, Firefox und
  Safari (auch auf iPhone und iPad)."
