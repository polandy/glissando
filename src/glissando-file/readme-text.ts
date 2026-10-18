/**
 * The plain-text entry explaining the container to anyone who opens it outside Glissando
 * (ADR-0038). Never read by `checkGlissandoFile` — it is for a person, not the app.
 */
export const README_TEXT = `This is a Glissando slideshow: one picture show, music, video clips and settings, packed into a
single .glissando file so it is easy to keep and to share. It is a ZIP archive; to look inside,
rename the file so it ends in .zip instead of .glissando and open it as you would any other ZIP.

What is inside:

  glissando.json         The slideshow itself: its settings and the order of its pictures,
                          music and video clips, as JSON.
  glissando.schema.json  A JSON Schema describing glissando.json's shape.
  pictures/               The pictures, full size.
  thumbnails/             Small previews of the pictures, shown while browsing.
  music/                  The music tracks.
  videos/                 The video clips.

Get Glissando at https://polandy.github.io/glissando/ to open this file as a slideshow.
`;
