import { describe, expect, it } from "vitest";
import type { FocusReply } from "./focus-worker-protocol";
import { postReply } from "./post-reply";

const request = { id: 7, thumbnail: new Blob() };
const none: FocusReply = { id: 7, kind: "found", focus: { kind: "none" } };

describe("postReply", () => {
  it("posts the answer", async () => {
    const posted: FocusReply[] = [];

    await postReply(
      request,
      async () => none,
      (reply) => posted.push(reply),
    );

    expect(posted).toEqual([none]);
  });

  it("posts a failed reply with the request id when posting the answer throws", async () => {
    const posted: FocusReply[] = [];
    let first = true;

    await postReply(
      request,
      async () => none,
      (reply) => {
        if (first) {
          first = false;
          throw new Error("could not clone");
        }
        posted.push(reply);
      },
    );

    expect(posted).toEqual([{ id: 7, kind: "failed", message: "could not clone" }]);
  });
});
