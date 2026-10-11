import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import type { ShareLink } from "../../server-library/server-library-client";
import { ShareLinkSession } from "./share-link-session";
import { FakeShareLinkApi } from "./testing/fake-share-link-api";

export const ORIGIN = "https://photos.example.org";
export const LINK: ShareLink = {
  token: "q7Rk2vN8xT4mWp1Lc9Hb3A",
  createdAt: "2026-10-11T09:30:00.000Z",
};
export const URL_OF_LINK = "https://photos.example.org/s/q7Rk2vN8xT4mWp1Lc9Hb3A";

export function harness({
  shared = null as ShareLink | null,
  origin = ORIGIN,
  withShareSheet = true,
  withClipboard = true,
  writeText = (() => Promise.resolve()) as (text: string) => Promise<void>,
  shareSheet = (() => Promise.resolve()) as (data: { title: string; url: string }) => Promise<void>,
} = {}) {
  const api = new FakeShareLinkApi("show", shared);
  const scheduler = new FakeScheduler();
  const copied: string[] = [];
  const sharedVia: { title: string; url: string }[] = [];
  const tabs: string[] = [];
  const turnedOff: string[] = [];
  const errors: unknown[] = [];
  const session = new ShareLinkSession("show", {
    api,
    origin,
    scheduler,
    clipboard: withClipboard ? { writeText: (text) => (copied.push(text), writeText(text)) } : null,
    shareSheet: withShareSheet ? (data) => (sharedVia.push(data), shareSheet(data)) : null,
    openTab: (url) => tabs.push(url),
    onTurnedOff: () => turnedOff.push("toast"),
    onError: (error) => errors.push(error),
  });
  return { api, scheduler, session, copied, sharedVia, tabs, turnedOff, errors };
}
