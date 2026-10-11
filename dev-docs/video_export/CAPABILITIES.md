# Capabilities

When the sheet opens, the export asks the browser, never a user-agent string:

- `VideoEncoder.isConfigSupported` for each preset's exact config; a refused preset is greyed out
  with "Kann dieses Gerät nicht kodieren". The default is 1080p, else the largest available.
- `AudioEncoder.isConfigSupported` for AAC, then Opus.
- Unsupported as a whole (the sheet explains only, no presets): no `VideoEncoder`, no WebGL2, no
  preset available, or music but neither AAC nor Opus. Copy: "Dieser Browser kann keine Videos
  erstellen. Dafür braucht Glissando WebCodecs. Es geht in aktuellem Chrome, Edge, Firefox und
  Safari (auch auf iPhone und iPad)."
