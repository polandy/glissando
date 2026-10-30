# Header

The header (`components/Header.svelte`) is a 56 px bar. On the start screen the logo mark and
the "Glissando" wordmark; elsewhere the back arrow and the breadcrumb (earlier crumbs hidden up
to 720 px wide, the current one ellipsised; the root crumb is "Library"); a right-hand slot for
the screen's own buttons. While an export runs, on every screen: a progress ring and "Exporting
“title” … 34 %" before the buttons (the label hidden up to 720 px, the ring stays) and a 3 px
mint line along the bar's bottom edge growing with the progress. While the faces-and-subjects
search runs, on every screen, after the export's: a lilac ring and "Looking for subjects · 12 of
40" ("Looking again" when every slideshow searched had a focus already), summed over the
device's and the server's slideshows still searched, and a 2 px lilac line, lifted above the
export's while both run (`components/FocusSearchIndicator.svelte`). It goes once no picture is
left; a picture it couldn't look at stays on the card only.
