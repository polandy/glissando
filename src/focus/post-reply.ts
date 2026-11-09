import type { FocusReply, FocusRequest } from "./focus-worker-protocol";

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Posts the answer to a request; when posting it throws, posts a `failed` reply so the request settles. */
export async function postReply(
  { id }: FocusRequest,
  answer: () => Promise<FocusReply>,
  post: (reply: FocusReply) => void,
): Promise<void> {
  try {
    post(await answer());
  } catch (error) {
    post({ id, kind: "failed", message: messageOf(error) });
  }
}
