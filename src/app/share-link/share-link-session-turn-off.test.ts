import { describe, expect, it } from "vitest";
import { ServerLibraryNotFoundError } from "../../server-library/server-library-client";
import { LINK, URL_OF_LINK, harness } from "./share-link-session-fixtures";

describe("ShareLinkSession, turning off and failures (share_link/IN_THE_APP.md)", () => {
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
