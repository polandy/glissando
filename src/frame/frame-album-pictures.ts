import type { ImmichClient, ImmichPhoto } from "../immich/immich-client";

const FIRST_PAGE = 1;

/**
 * Reads a whole Immich album, page by page (`dev-docs/app/FRAME.md`): a picture frame deals from
 * the complete album, not a loaded-so-far slice, so there is no incremental loading state here.
 */
export async function fetchAlbumPictures(
  client: Pick<ImmichClient, "photos">,
  albumId: string,
): Promise<readonly ImmichPhoto[]> {
  const pictures: ImmichPhoto[] = [];
  let page = FIRST_PAGE;
  for (;;) {
    const result = await client.photos({ page, albumId });
    pictures.push(...result.photos);
    if (result.nextPage === null) {
      return pictures;
    }
    page = result.nextPage;
  }
}
