import { describe, expect, it } from "vitest";
import { LINK, URL_OF_LINK, harness } from "./share-link-session-fixtures";

describe("ShareLinkSession, sharing and opening the link (share_link/IN_THE_APP.md)", () => {
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
});
