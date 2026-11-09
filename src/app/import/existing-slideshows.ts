import type { ExistingSlideshow } from "../../compose";
import type { SlideshowStore } from "../../library/library-store";
import { ServerLibraryUnavailableError } from "../../server-library/server-library-client";

type Listing = Pick<SlideshowStore, "listSlideshows">;

async function titlesAndDates(store: Listing): Promise<readonly ExistingSlideshow[]> {
  const slideshows = await store.listSlideshows();
  return slideshows.map(({ title, pictures }) => ({
    title,
    capturedAt: pictures.map((picture) => picture.capturedAt),
  }));
}

/**
 * The slideshows a new slideshow's automatic title keeps clear of: the device's, and the
 * server's too when the new one goes to the server. A server that is out of reach leaves its
 * slideshows out; the title is then only distinct on the device.
 */
export async function existingSlideshowsOf(
  stores: { readonly device: Listing; readonly server: Listing },
  onServer: boolean,
): Promise<readonly ExistingSlideshow[]> {
  const device = await titlesAndDates(stores.device);
  if (!onServer) return device;
  try {
    return [...device, ...(await titlesAndDates(stores.server))];
  } catch (error) {
    if (error instanceof ServerLibraryUnavailableError) return device;
    throw error;
  }
}
