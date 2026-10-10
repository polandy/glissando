import type { SlideshowStore } from "../../library/stored-slideshow";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";
import type {
  ServerLibraryMemory,
  ServerSlideshowCard,
} from "../../server-library/server-library-memory";
import type { ObjectUrls } from "../media/object-urls";
import type { ServerShelf, SlideshowSummary } from "../screens/view-models";
import { loadStartSlideshows } from "./route-loading";

export interface ServerShelfPorts {
  readonly store: Pick<SlideshowStore, "listSlideshows">;
  readonly memory: Pick<ServerLibraryMemory, "cards" | "rememberCards">;
}

function cardOf({ id, title, pictureCount, durationSeconds, hasMusic }: SlideshowSummary) {
  return { id, title, pictureCount, durationSeconds, hasMusic };
}

/** No thumbnails offline: a remembered card's cover stays neutral. */
function rememberedShelf(cards: readonly ServerSlideshowCard[]): ServerShelf {
  return { offline: true, slideshows: cards.map((card) => ({ ...card, coverUrls: [] })) };
}

/**
 * The library's server section (`dev-docs/SERVER_LIBRARY.md`, Library): on, the server's list
 * with the covers Immich could give, remembered for offline; offline, or once the server stops
 * answering, the remembered cards. Null once `left` aborted (see `loadStartSlideshows`).
 */
export async function loadServerShelf(
  kind: "on" | "offline",
  { store, memory }: ServerShelfPorts,
  covers: Pick<ObjectUrls, "sync" | "settled" | "get">,
  left: AbortSignal,
): Promise<ServerShelf | null> {
  if (kind === "offline") return rememberedShelf(memory.cards());
  let loaded: readonly SlideshowSummary[] | null;
  try {
    loaded = await loadStartSlideshows(store, covers, left);
  } catch (error) {
    if (error instanceof ServerLibraryUnavailableError) return rememberedShelf(memory.cards());
    throw error;
  }
  if (loaded === null) return null;
  memory.rememberCards(loaded.map(cardOf));
  return {
    offline: false,
    // A picture Immich no longer has leaves its cover cell out.
    slideshows: loaded.map((summary) => ({
      ...summary,
      coverUrls: summary.coverUrls.filter((url) => url !== ""),
    })),
  };
}
