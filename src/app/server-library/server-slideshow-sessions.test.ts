import { describe, expect, it } from "vitest";
import { CODE, harness } from "../tv-remote/tv-session-fixtures";
import { openTvAtStart } from "./server-slideshow-sessions";

/** An address the app opened at, recording what the history rewrote it to. */
function startAddress(search: string) {
  const rewritten: string[] = [];
  const address = {
    location: { pathname: "/app/", search, hash: "#/s/july" },
    history: {
      state: null,
      replaceState: (_state: unknown, _unused: string, url?: string | URL | null) => {
        rewritten.push(String(url));
      },
    },
  };
  return { address, rewritten };
}

describe("Opening Show on TV from the TV's QR code (tv_remote/IN_THE_APP.md)", () => {
  it("connects with the code from ?tv= and takes it out of the address", () => {
    const { session } = harness({ openedFrom: null });
    const { address, rewritten } = startAddress(`?lang=de&tv=${CODE}`);

    const opened = openTvAtStart(address, () => session);

    expect(opened).toBe(session);
    expect(session.state).toMatchObject({ step: "code", code: CODE, pending: "claim" });
    expect(rewritten).toEqual(["/app/?lang=de#/s/july"]);
  });

  it("opens on empty boxes when ?tv= carries no complete code", () => {
    const { session } = harness({ openedFrom: null });
    const { address, rewritten } = startAddress("?tv=KX");

    openTvAtStart(address, () => session);

    expect(session.state).toMatchObject({ step: "code", code: "", pending: null });
    expect(rewritten).toEqual(["/app/#/s/july"]);
  });

  it("leaves the address alone and opens nothing without ?tv=", () => {
    const { address, rewritten } = startAddress("?lang=de");
    let made = 0;

    const opened = openTvAtStart(address, () => {
      made += 1;
      return harness().session;
    });

    expect(opened).toBeNull();
    expect(made).toBe(0);
    expect(rewritten).toEqual([]);
  });
});
