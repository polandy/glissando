import { describe, expect, it } from "vitest";
import { FakeScheduler } from "../../ui-kit/testing/fake-scheduler";
import {
  ServerLibraryNotFoundError,
  type ShareLink,
} from "../../server-library/server-library-client";
import { COPIED_FEEDBACK_MS, ShareLinkSession } from "./share-link-session";
import { FakeShareLinkApi } from "./testing/fake-share-link-api";

const ORIGIN = "https://photos.example.org";
const LINK: ShareLink = { token: "q7Rk2vN8xT4mWp1Lc9Hb3A", createdAt: "2026-10-11T09:30:00.000Z" };
const URL_OF_LINK = "https://photos.example.org/s/q7Rk2vN8xT4mWp1Lc9Hb3A";

function harness({
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

describe("ShareLinkSession (share_link/IN_THE_APP.md)", () => {
  it("knows nothing of the link until the server answered", () => {
    const { session } = harness();

    expect(session.state.link).toBeUndefined();
  });

  it("reads a shared slideshow's link, made of the app's origin, /s/ and the token", async () => {
    const { session } = harness({ shared: LINK });

    await session.load();

    expect(session.state.link).toEqual({ url: URL_OF_LINK, createdAt: LINK.createdAt });
  });

  it("reads a slideshow that is not shared as having no link", async () => {
    const { session } = harness();

    await session.load();

    expect(session.state.link).toBeNull();
  });

  it("tells its listeners each change", async () => {
    const { session } = harness({ shared: LINK });
    const seen: unknown[] = [];
    session.subscribe((state) => seen.push(state.link));

    await session.load();

    expect(seen).toContainEqual({ url: URL_OF_LINK, createdAt: LINK.createdAt });
  });

  it("opens the sheet and closes it again", async () => {
    const { session } = harness();
    await session.load();

    session.open();
    expect(session.state.sheet).toBe("share");
    session.close();

    expect(session.state.sheet).toBe("closed");
  });

  it("creates the link on the server and shows it", async () => {
    const { session, api } = harness();
    await session.load();
    session.open();

    const created = session.create();
    expect(session.state.pending).toBe("create");
    await created;

    expect(api.shared).not.toBeNull();
    expect(session.state).toMatchObject({ sheet: "share", pending: null });
    expect(session.state.link?.url).toBe(`${ORIGIN}/s/${api.shared?.token ?? ""}`);
  });

  it("copies the link, says Copied for 2 s and then Copy again", async () => {
    const { session, copied, scheduler } = harness({ shared: LINK });
    await session.load();
    session.open();

    await session.copy();
    expect(copied).toEqual([URL_OF_LINK]);
    expect(session.state.copied).toBe(true);
    scheduler.advance(COPIED_FEEDBACK_MS - 1);
    expect(session.state.copied).toBe(true);
    scheduler.advance(1);

    expect(session.state.copied).toBe(false);
  });

  it("restarts Copied's 2 s on a second copy", async () => {
    const { session, scheduler } = harness({ shared: LINK });
    await session.load();
    await session.copy();
    scheduler.advance(COPIED_FEEDBACK_MS - 1);

    await session.copy();
    scheduler.advance(COPIED_FEEDBACK_MS - 1);

    expect(session.state.copied).toBe(true);
    expect(scheduler.pending).toBe(1);
  });

  it("forgets Copied and the QR code when the sheet closes", async () => {
    const { session, scheduler } = harness({ shared: LINK });
    await session.load();
    session.open();
    await session.copy();
    session.toggleQrCode();

    session.close();

    expect(session.state).toMatchObject({ copied: false, qrCodeShown: false });
    expect(scheduler.pending).toBe(0);
  });

  it("hands a clipboard that refuses the link on to the app, without saying Copied", async () => {
    const refused = new DOMException("Write permission denied.", "NotAllowedError");
    const { session, errors, scheduler } = harness({
      shared: LINK,
      writeText: () => Promise.reject(refused),
    });
    await session.load();
    session.open();

    await session.copy();

    expect(errors).toEqual([refused]);
    expect(session.state.copied).toBe(false);
    expect(scheduler.pending).toBe(0);
  });

  it.each([
    { what: "the sheet closed", end: (session: ShareLinkSession) => session.close() },
    { what: "the screen closed", end: (session: ShareLinkSession) => session.dispose() },
  ])("says nothing of a copy that lands after $what", async ({ end }) => {
    const write = Promise.withResolvers<undefined>();
    const { session, copied, scheduler } = harness({
      shared: LINK,
      writeText: () => write.promise,
    });
    await session.load();
    session.open();
    const copying = session.copy();
    expect(copied).toEqual([URL_OF_LINK]);

    end(session);
    write.resolve(undefined);
    await copying;

    expect(session.state.copied).toBe(false);
    expect(scheduler.pending).toBe(0);
  });

  it("shows and hides the QR code", async () => {
    const { session } = harness({ shared: LINK });
    await session.load();

    session.toggleQrCode();
    expect(session.state.qrCodeShown).toBe(true);
    session.toggleQrCode();

    expect(session.state.qrCodeShown).toBe(false);
  });

  it("hands the link with the title to the browser's share sheet where there is one", async () => {
    const { session, sharedVia } = harness({ shared: LINK });
    await session.load();

    expect(session.canUseShareSheet).toBe(true);
    await session.shareVia("Summer 2025");

    expect(sharedVia).toEqual([{ title: "Summer 2025", url: URL_OF_LINK }]);
  });

  it.each([
    { withClipboard: true, canCopy: true },
    { withClipboard: false, canCopy: false },
  ])(
    "offers Copy only where the browser has a clipboard ($withClipboard)",
    ({ withClipboard, canCopy }) => {
      expect(harness({ withClipboard }).session.canCopy).toBe(canCopy);
    },
  );

  it("takes a dismissed share sheet as no failure", async () => {
    const { session, sharedVia, errors } = harness({
      shared: LINK,
      shareSheet: () => Promise.reject(new DOMException("Share canceled", "AbortError")),
    });
    await session.load();

    await session.shareVia("Summer 2025");

    expect(sharedVia).toHaveLength(1);
    expect(errors).toEqual([]);
  });

  it("hands any other share sheet failure on to the app", async () => {
    const refused = new DOMException("Not allowed", "NotAllowedError");
    const { session, errors } = harness({
      shared: LINK,
      shareSheet: () => Promise.reject(refused),
    });
    await session.load();

    await session.shareVia("Summer 2025");

    expect(errors).toEqual([refused]);
  });

  it("offers no share sheet where the browser has none", () => {
    const { session } = harness({ withShareSheet: false });

    expect(session.canUseShareSheet).toBe(false);
  });

  it("opens the link as a viewer in a new tab", async () => {
    const { session, tabs } = harness({ shared: LINK });
    await session.load();

    session.openAsViewer();

    expect(tabs).toEqual([URL_OF_LINK]);
  });

  it("asks before turning off, and Cancel goes back to the link", async () => {
    const { session, api } = harness({ shared: LINK });
    await session.load();
    session.open();

    session.askTurnOff();
    expect(session.state.sheet).toBe("confirmTurnOff");
    session.cancelTurnOff();

    expect(session.state.sheet).toBe("share");
    expect(api.shared).toEqual(LINK);
  });

  it("turns the link off on the server, closes the sheet and says so in a toast", async () => {
    const { session, api, turnedOff } = harness({ shared: LINK });
    await session.load();
    session.open();
    session.toggleQrCode();
    session.askTurnOff();

    await session.turnOff();

    expect(turnedOff).toEqual(["toast"]);
    expect(api.shared).toBeNull();
    expect(session.state).toMatchObject({ link: null, sheet: "closed", qrCodeShown: false });
  });

  it.each([
    { request: "create" as const, shared: null },
    { request: "turnOff" as const, shared: LINK },
  ])(
    "keeps the sheet with Try again when the server does not answer $request",
    async ({ request, shared }) => {
      const { session, api, turnedOff } = harness({ shared });
      await session.load();
      session.open();
      api.down = true;

      await (request === "create" ? session.create() : session.turnOff());

      expect(session.state).toMatchObject({ unanswered: request, pending: null });
      expect(session.state.link).toEqual(shared === null ? null : expect.anything());
      expect(turnedOff).toEqual([]);
      api.down = false;
      await session.retry();
      expect(session.state.unanswered).toBeNull();
      expect(session.state.link === null).toBe(request === "turnOff");
    },
  );

  it("offers Try again when reading the link fails, and the retry reads it", async () => {
    const { session, api } = harness({ shared: LINK });
    api.down = true;

    await session.load();
    expect(session.state).toMatchObject({ link: undefined, unanswered: "load" });
    api.down = false;
    await session.retry();

    expect(session.state).toMatchObject({ unanswered: null, link: { url: URL_OF_LINK } });
  });

  it("reads the link again when the sheet opens before it was ever known", async () => {
    const { session, api } = harness({ shared: LINK });
    api.down = true;
    await session.load();
    session.close();
    api.down = false;

    session.open();
    await api.settled();

    expect(session.state.link).toEqual({ url: URL_OF_LINK, createdAt: LINK.createdAt });
  });

  it("hands any other failure on to the app, loudly", async () => {
    const { session, api, errors } = harness();
    await session.load();
    api.failWith = new ServerLibraryNotFoundError("POST /api/library/slideshows/show/share");

    await session.create();

    expect(errors).toEqual([api.failWith]);
    expect(session.state).toMatchObject({ pending: null, unanswered: null, link: null });
  });

  it.each([
    { origin: "https://photos.example.org", homeNetwork: false },
    { origin: "http://192.168.1.20:8080", homeNetwork: true },
  ])("notes a home network address for $origin: $homeNetwork", ({ origin, homeNetwork }) => {
    expect(harness({ origin }).session.atHomeNetworkAddress).toBe(homeNetwork);
  });
});
