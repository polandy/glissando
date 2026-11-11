// The gallery's browsing reads: the metadata search with its filters, the timeline, people and
// folders, answered like Immich 3.3.1 over the generated photos. Every ninth photo is a HEIC,
// which the app does not list.
import { drawPhoto } from "./fake-immich-images.mjs";

const DEFAULT_SEARCH_SIZE = 250;
const HEIC_EVERY = 9;
const FAVORITE_EVERY = 4;
const PERSON_THUMBNAIL_SIDE = 250;
const MONTH_LENGTH = "YYYY-MM".length;
const PEOPLE = [
  { number: 1, name: "Alex Example", every: 2, isHidden: false },
  { number: 2, name: "Sam Sample", every: 3, isHidden: false },
  { number: 3, name: "", every: 5, isHidden: false },
  { number: 4, name: "Hidden Hannah", every: 7, isHidden: true },
];
// Folders as Immich's external libraries and imports show them: the photos of the first days
// lie in the lake folder, the next in the town folder.
const FOLDERS = [
  { path: "Trips/Lake", days: [0, 1] },
  { path: "Trips/Town", days: [2, 3] },
];

export const isHeic = (photo) => photo.number % HEIC_EVERY === 0;

const hex12 = (n) => n.toString(16).padStart(12, "0");

export function createBrowse({ photos, albums }) {
  const people = PEOPLE.map((person) => ({
    ...person,
    id: `b0000000-0000-4000-8000-${hex12(person.number)}`,
  }));

  const asset = (photo, withExif) => ({
    id: photo.id,
    type: "IMAGE",
    originalFileName: photo.fileName,
    originalMimeType: isHeic(photo) ? "image/heic" : "image/jpeg",
    localDateTime: photo.takenAt,
    fileCreatedAt: photo.takenAt,
    width: photo.width,
    height: photo.height,
    isFavorite: photo.number % FAVORITE_EVERY === 0,
    isTrashed: false,
    ...(withExif ? { exifInfo: { city: photo.city } } : {}),
  });

  const newestFirst = (list, order) =>
    [...list].sort((a, b) => a.takenAt.localeCompare(b.takenAt) * (order === "asc" ? 1 : -1));

  function searchMetadata(query) {
    const size = query.size ?? DEFAULT_SEARCH_SIZE;
    const page = query.page ?? 1;
    const albumIds = query.albumIds ?? [];
    const personIds = query.personIds ?? [];
    const inAlbums = albums.filter((album) => albumIds.includes(album.id));
    const ofPeople = people.filter((person) => personIds.includes(person.id));
    const matching = newestFirst(
      photos.filter(
        (photo) =>
          (albumIds.length === 0 || inAlbums.some((a) => a.members.has(photo.id))) &&
          (personIds.length === 0 || ofPeople.some((p) => photo.number % p.every === 0)) &&
          (query.isFavorite !== true || photo.number % FAVORITE_EVERY === 0) &&
          (query.takenBefore === undefined || photo.takenAt < query.takenBefore),
      ),
      query.order,
    );
    const items = matching
      .slice((page - 1) * size, page * size)
      .map((photo) => asset(photo, query.withExif === true));
    const nextPage = page * size < matching.length ? String(page + 1) : null;
    const noAlbums = { total: 0, count: 0, items: [], facets: [], nextPage: null };
    return {
      albums: noAlbums,
      assets: { total: matching.length, count: items.length, items, facets: [], nextPage },
    };
  }

  function timelineBuckets() {
    const counts = new Map();
    for (const photo of photos) {
      const month = photo.takenAt.slice(0, MONTH_LENGTH);
      counts.set(month, (counts.get(month) ?? 0) + 1);
    }
    return [...counts]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, count]) => ({ timeBucket: `${month}-01T00:00:00.000Z`, count }));
  }

  const folderPaths = () => FOLDERS.map(({ path }) => path);
  const folderAssets = (path) => {
    const folder = FOLDERS.find((candidate) => candidate.path === path);
    const inside = photos.filter((photo) => folder?.days.includes(photo.day));
    return newestFirst(inside, "desc").map((photo) => asset(photo, true));
  };

  function peoplePage(query) {
    const page = Number(query.get("page") ?? 1);
    const size = Number(query.get("size") ?? DEFAULT_SEARCH_SIZE);
    const visible = query.get("withHidden") === "true" ? people : people.filter((p) => !p.isHidden);
    const items = visible.slice((page - 1) * size, page * size);
    return {
      people: items.map(({ id, name, isHidden }) => ({ id, name, isHidden, birthDate: null })),
      total: visible.length,
      hidden: people.length - visible.length,
      hasNextPage: page * size < visible.length,
    };
  }

  const thumbnails = new Map(
    people.map((person) => [
      person.id,
      drawPhoto(
        { number: person.number, faces: [{ cx: 0.5, cy: 0.45 }] },
        PERSON_THUMBNAIL_SIDE,
        PERSON_THUMBNAIL_SIDE,
      ),
    ]),
  );

  return {
    searchMetadata,
    /** The JSON answer of a browsing read, or undefined for a route that is not one. */
    answer(route, url) {
      if (route === "GET /api/timeline/buckets") return timelineBuckets();
      if (route === "GET /api/people") return peoplePage(url.searchParams);
      if (route === "GET /api/view/folder/unique-paths") return folderPaths();
      if (route === "GET /api/view/folder") return folderAssets(url.searchParams.get("path"));
      return undefined;
    },
    /** The PNG of a person's face crop, or undefined for another path. */
    personThumbnail(pathname) {
      const id = /^\/api\/people\/([0-9a-f-]{36})\/thumbnail$/.exec(pathname)?.[1];
      return id === undefined ? undefined : thumbnails.get(id);
    },
  };
}
