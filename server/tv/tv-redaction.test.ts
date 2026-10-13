import { describe, expect, it } from "vitest";
import { redactTvSecrets } from "./tv-redaction";

const KEY = "AQEBAQEBAQEBAQEBAQEBAQ";

describe("redacting TV keys and remote secrets from a logged path", () => {
  it.each([
    [`/api/tv/${KEY}/events`, "/api/tv/…/events"],
    [`/api/tv/${KEY}/state`, "/api/tv/…/state"],
    [`/api/tv/${KEY}/show`, "/api/tv/…/show"],
    [`/api/tv/${KEY}/show/3/pictures/1`, "/api/tv/…/show/3/pictures/1"],
    [`/api/tv/${KEY}/show/songs/0`, "/api/tv/…/show/songs/0"],
    [`/api/tv/${KEY}`, "/api/tv/…"],
    [`/API/TV/${KEY}/events`, "/API/TV/…/events"],
    [`/api/tv/remote/${KEY}/events`, "/api/tv/remote/…/events"],
    [`/api/tv/remote/${KEY}/command`, "/api/tv/remote/…/command"],
    [`/api/library/tv/${KEY}/show`, "/api/library/tv/…/show"],
    [`/r/${KEY}`, "/r/…"],
    [`/R/${KEY}`, "/R/…"],
    [`/internal/tv-picture/${KEY}/0`, "/internal/tv-picture/…/0"],
    ["/api/tv/sessions", "/api/tv/sessions"],
    ["/api/tv/remote", "/api/tv/remote"],
    ["/api/library/tv/claim", "/api/library/tv/claim"],
    [`/api/tv/sessionsX${KEY}`, "/api/tv/…"],
    [`/api/library/tv/claim${KEY}`, "/api/library/tv/…"],
    [`/api/library/slideshows/${KEY}`, `/api/library/slideshows/${KEY}`],
    [`/api/tvs/${KEY}`, `/api/tvs/${KEY}`],
  ])("logs %s as %s", (path, logged) => {
    expect(redactTvSecrets(path)).toBe(logged);
  });
});
