import { describe, expect, it } from "vitest";
import { COPIED_FEEDBACK_MS, type ShareLinkSession } from "./share-link-session";
import { LINK, URL_OF_LINK, harness } from "./share-link-session-fixtures";

describe("ShareLinkSession, copying the link and its QR code (share_link/IN_THE_APP.md)", () => {
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
});
