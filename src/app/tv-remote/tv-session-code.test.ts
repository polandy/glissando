import { describe, expect, it } from "vitest";
import { CODE, SECRET, SLIDESHOWS, harness } from "./tv-session-fixtures";

describe("the TV sheet's code step (tv_remote/IN_THE_APP.md)", () => {
  it("opens on the code step, naming the TV's address", () => {
    const { session } = harness();

    session.open();

    expect(session.state.step).toBe("code");
    expect(session.state.code).toBe("");
    expect(session.tvAddress).toBe("photos.example.org/tv");
  });

  it("keeps a typed code upper-cased, its letters only", () => {
    const { session } = harness();
    session.open();

    session.type("kx1q");

    expect(session.state.code).toBe("KXQ");
    expect(session.canConnect).toBe(false);
    session.type("kxqm");
    expect(session.canConnect).toBe(true);
  });

  it("connects with a complete code, then offers the server's slideshows", async () => {
    const { session, api } = harness();
    session.open();
    session.type(CODE);

    await session.connect();

    expect(session.state.step).toBe("pick");
    expect(session.state.connectedCode).toBe(CODE);
    expect(session.state.slideshows).toEqual(SLIDESHOWS);
    expect(api.codes.has(CODE)).toBe(false);
  });

  it("refuses to connect with an incomplete code", async () => {
    const { session } = harness();
    session.open();
    session.type("KX");

    await expect(session.connect()).rejects.toThrow(/4 letters/);
  });

  it("connects at once with a prefilled code", async () => {
    const { session, api } = harness();

    session.open("kxqm");
    expect(session.state.pending).toBe("claim");
    await api.settled();

    expect(session.state.step).toBe("pick");
    expect(session.state.slideshows).toEqual(SLIDESHOWS);
  });

  it("says a code matches no TV, and Type it again empties the boxes", async () => {
    const { session, errors } = harness();
    session.open();
    session.type("ABCD");

    await session.connect();
    expect(session.state.step).toBe("noMatch");
    session.retypeCode();

    expect(session.state.step).toBe("code");
    expect(session.state.code).toBe("");
    expect(errors).toEqual([]);
  });

  it("offers Try again when the server does not answer the claim, which claims", async () => {
    const { session, api } = harness();
    session.open();
    session.type(CODE);
    api.down = true;

    await session.connect();
    expect(session.state).toMatchObject({ step: "code", unanswered: "claim", pending: null });
    api.down = false;
    await session.retry();

    expect(session.state).toMatchObject({ step: "pick", unanswered: null });
  });

  it("disconnects a claim that lands after the sheet closed", async () => {
    const { session, api } = harness();
    session.open();
    session.type(CODE);

    const connecting = session.connect();
    session.close();
    await connecting;
    await api.settled();

    expect(session.state.step).toBe("closed");
    expect(api.disconnected).toEqual([SECRET]);
  });
});
