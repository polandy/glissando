import type { TvSlideshowCard } from "./tv-session";
import { TvSession } from "./tv-session";
import { FakeTvApi } from "./testing/fake-tv-api";

export const SECRET = "r7Rk2vN8xT4mWp1Lc9Hb3A";
export const CODE = "KXQM";
export const SLIDESHOWS: readonly TvSlideshowCard[] = [
  { id: "july", title: "July 2025", pictureCount: 48, durationSeconds: 200 },
  { id: "hike", title: "Mountain hike", pictureCount: 96, durationSeconds: 400 },
];

/** A session over a server where the TV shows `CODE`, opened from `openedFrom`. */
export function harness({ openedFrom = "hike" as string | null } = {}) {
  const api = new FakeTvApi(SLIDESHOWS);
  api.codes.set(CODE, SECRET);
  const opened: string[] = [];
  const errors: unknown[] = [];
  const logged: unknown[] = [];
  const session = new TvSession(openedFrom, {
    api,
    origin: "https://photos.example.org",
    openRemote: (path) => opened.push(path),
    onError: (error) => errors.push(error),
    log: (error) => logged.push(error),
  });
  return { api, session, opened, errors, logged };
}
