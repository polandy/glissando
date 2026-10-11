import { describe, expect, it } from "vitest";
import { LINK, ORIGIN, URL_OF_LINK, harness } from "./share-link-session-fixtures";

describe("ShareLinkSession, reading and creating the link (share_link/IN_THE_APP.md)", () => {
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
});
