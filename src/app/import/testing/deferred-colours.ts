import type { ImmichPhoto } from "../../../immich/immich-client";
import type { PictureColours } from "../../../library/picture-colours";

export const LINKED_COLOURS: PictureColours = { veil: "#404040", accent: "#C0C0C0" };

export interface ColourRead {
  resolve(): void;
  reject(error: unknown): void;
}

/**
 * The `immichColours` port whose reads wait until the test settles them, so the order of a
 * link's steps is the test's, not the scheduler's. `asked(id)` resolves with the read once a
 * link has asked for that photo's colours.
 */
export function deferredColours() {
  /** Every read asked for, a photo read twice included. */
  const reads: ColourRead[] = [];
  let answering = false;
  const waiting = new Map<string, (read: ColourRead) => void>();
  const asks = new Map<string, Promise<ColourRead>>();
  const asked = (id: string): Promise<ColourRead> => {
    let ask = asks.get(id);
    if (ask === undefined) {
      ask = new Promise((resolve) => waiting.set(id, resolve));
      asks.set(id, ask);
    }
    return ask;
  };
  return {
    asked,
    /** Settles every read asked for so far and answers each later one at once. */
    answerAll: (): void => {
      answering = true;
      for (const read of reads) read.resolve();
    },
    colours: (photo: ImmichPhoto): Promise<PictureColours> =>
      new Promise((resolve, reject) => {
        if (answering) {
          resolve(LINKED_COLOURS);
          return;
        }
        const read = { resolve: () => resolve(LINKED_COLOURS), reject };
        reads.push(read);
        void asked(photo.id);
        waiting.get(photo.id)?.(read);
      }),
  };
}
