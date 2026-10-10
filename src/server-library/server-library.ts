import type { ImmichUnavailableKind } from "../immich/immich-client";
import type { ImmichPictureReaders } from "../import/immich-picture-source";
import type { StoredSlideshow } from "../library/stored-slideshow";
import { keepCopyOnDevice, type KeepCopyOptions, type KeepCopyPorts } from "./keep-copy";
import { createServerSlideshow, saveOnServer, type SaveOnServerPorts } from "./save-on-server";
import {
  ServerLibraryAvailability,
  type ImmichAvailabilitySource,
} from "./server-library-availability";
import type { ServerLibraryClient } from "./server-library-client";
import type { ServerLibraryMemory } from "./server-library-memory";
import { ServerSlideshowStore } from "./server-slideshow-store";

/** Slideshows on the Glissando server, as the app uses them (`dev-docs/SERVER_LIBRARY.md`). */
export interface ServerLibrary {
  readonly availability: ServerLibraryAvailability;
  /** What this device keeps of the library for when the server is away. */
  readonly memory: ServerLibraryMemory;
  /** The server's slideshows behind the store slices the screens and the player use. */
  readonly store: ServerSlideshowStore;
  /** Creates a server slideshow (`createServerSlideshow`); its music's audio first. */
  createSlideshow(slideshow: StoredSlideshow, musicAudio: Blob | null): Promise<StoredSlideshow>;
  /** "Save on the server" for a device slideshow (`saveOnServer`). */
  saveOnServer(deviceSlideshow: StoredSlideshow): Promise<StoredSlideshow>;
  /** "Keep a copy on this device" for a server slideshow (`keepCopyOnDevice`). */
  keepCopy(serverSlideshow: StoredSlideshow, options: KeepCopyOptions): Promise<StoredSlideshow>;
}

export interface ServerLibraryDependencies {
  readonly client: ServerLibraryClient;
  readonly immichAvailability: ImmichAvailabilitySource;
  readonly memory: ServerLibraryMemory;
  /** Reads Immich's pictures as the import does. */
  readonly immich: ImmichPictureReaders;
  /** The device's store: the music saved on the server comes from it, copies go into it. */
  readonly deviceStore: SaveOnServerPorts["store"] & KeepCopyPorts["store"];
  newId(): string;
  now(): Date;
  log(error: unknown): void;
}

/** Wires the server library's parts; used by the composition root. */
export function createServerLibrary(dependencies: ServerLibraryDependencies): ServerLibrary {
  const { client, immich, deviceStore, log } = dependencies;
  const reportUnavailable = (kind: ImmichUnavailableKind) => immich.reportUnavailable(kind);
  const store = new ServerSlideshowStore({
    client,
    immich: immich.client,
    decode: immich.decode,
    reportUnavailable,
    log,
  });
  return {
    availability: new ServerLibraryAvailability({
      client,
      immich: dependencies.immichAvailability,
      memory: dependencies.memory,
      log,
    }),
    memory: dependencies.memory,
    store,
    createSlideshow: (slideshow, musicAudio) =>
      createServerSlideshow(slideshow, musicAudio, client),
    saveOnServer: (deviceSlideshow) =>
      saveOnServer(deviceSlideshow, { client, store: deviceStore }),
    keepCopy: (serverSlideshow, options) =>
      keepCopyOnDevice(
        serverSlideshow,
        {
          store: deviceStore,
          server: store,
          immich,
          newId: dependencies.newId,
          now: dependencies.now,
          log,
        },
        options,
      ),
  };
}
