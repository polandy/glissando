# The link

- `https://<host>/s/<token>`. The host is the origin the app is open at. The token is 16 random
  bytes as base64url without padding (22 characters, `SHARE_TOKEN_BYTES`), made by the
  service's injected random source.
- **One link per slideshow.** It is valid until it is turned off. Turning it off deletes the
  token, and sharing again makes a new one. Deleting the slideshow deletes its link.
- **Live**: the recipient's page loads the slideshow as it is now whenever it starts (the page
  opens, Play, "Play again"), so edits show up there.
- The token is stored as it is, so every device of the household can show the link again.
  Only the private API, which sits behind the owner's sign-in, ever answers with it.
- **What a recipient gets**: the share document (below), the pictures by their position, and the
  songs by their position. Never Immich asset ids, music ids, file names, exact capture dates,
  the slideshow's id, or anything about other slideshows.
