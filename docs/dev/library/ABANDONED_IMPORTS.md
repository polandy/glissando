# Abandoned imports and claims

Media no saved slideshow references (a cancelled or interrupted import) is deleted by
`deleteUnreferencedMedia`, run at startup and after each import ends. An import claims every media
id (a video's `mediaId` included) in `imports` (`claimMedia`) before writing the media, and its claim is released
(`releaseClaim`) when the slideshow is created or the import discarded; until then the clean-up —
in any tab — spares its media. An undoable removal claims its media the same way (above). A record older
than one day (`CLAIM_SPARED_FOR_MS`, from a tab that crashed) is dropped and its media deleted.
The clean-up reads the references and claims and deletes in one transaction, a deleted
picture's focus and a deleted track's beats included. Web Locks would
need a secure context, which the app over plain HTTP on the LAN lacks.
