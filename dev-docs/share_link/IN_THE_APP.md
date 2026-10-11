# In the app

- **Share row** in the info panel, its own row under the server row (`ShareRow.svelte`):
  - Server slideshow, not shared: link icon, "Share link", "Anyone with the link can watch",
    chevron.
  - Shared: "Shared by link", the link without its scheme (mono, ellipsis), a mint "On" pill,
    chevron.
  - Device slideshow: dimmed, not a button, "Save it on your Glissando server to share it by
    link."
- **Share sheet** (`ShareSheet.svelte`; a dialog on desktop, a bottom sheet on the phone; closing
  gives focus back to the row):
  - **Not shared**: "Share by link", the summary "<title> · 50 pictures · 4:10 · with music", three
    lines (anyone with the link can watch in a browser, without signing in or installing
    anything; they see the slideshow in 4K with its music and captions, and nothing else; edits
    show up, and it works until you turn it off), then "Cancel" and "Create link".
  - **Shared**: the link (read-only, mono; a tap or click selects all of it) with "Copy" where
    the browser offers the clipboard, so not over plain `http:` (then "Copied" for 2 s, from the
    injected scheduler), "Share …" where `navigator.share` exists, "Open as viewer" (a new tab), and
    "QR code", which shows or hides the link's QR code. Below that, "Created <date> · works until
    you turn it off", the date in the app's date format (`formatDate`, "11.10.2026" in German),
    then "Turn off link" (destructive text button) and "Done".
  - **Turn off?**: "Turn off the link?", "Anyone who has it can no longer watch “<title>”. If you
    share it again, it gets a new link and this one stays off.", then "Cancel" and "Turn off
    link" (coral). Afterwards the sheet closes and a toast says "Link turned off".
  - **Home network note** (lemon), in both states, when the app's origin is a home network
    address: plain `http:`, a `localhost`, `.local`, `.lan` or `.home.arpa` name, or a private,
    shared (100.64.0.0/10, e.g. Tailscale's), loopback or link-local IP (`isHomeNetworkOrigin`, a
    pure function). The note reads: "This link only works
    on your home network. Glissando is open at a home address here. To share with someone
    elsewhere, open Glissando through its public address and share from there."
  - **Failures**: the server not answering shows the server sheet's usual error with "Try again".
- **QR code**: `uqr` (MIT, no dependencies) encodes the link. It's the one new dependency,
  because QR encoding with error correction and masking is a well-specified but error-prone
  algorithm.
- `src/app/share-link/`: the session (`share-link-session.ts`, its states and the calls through a
  `ShareLinkApi` port, unit-tested with a fake), the origin check, and the sheet's parts.
- **Reading the link**: the screen of a server slideshow asks `GET /api/library/slideshows/{id}`
  for its `share` as it opens; until it answers, the row reads as not shared and the sheet says
  "Reading the link …". `DELETE` answering 404 `notShared` counts as turned off.
- The QR code is drawn as one SVG path in `--gl-qr-dark` on `--gl-qr-light`, dark on white in
  both themes, with medium error correction and a two-module quiet zone.
