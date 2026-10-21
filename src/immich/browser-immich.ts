import { browserNetworkStatus, ImmichAvailability } from "./immich-availability";
import { HttpImmichClient } from "./http-immich-client";

/** Same origin: the self-hosted Glissando's `/immich/` route sets the API key (ADR-0013). */
export function browserImmich(window: Window): {
  readonly client: HttpImmichClient;
  readonly availability: ImmichAvailability;
} {
  const client = new HttpImmichClient({
    baseUrl: new URL("./immich/", window.location.href),
    fetch: window.fetch.bind(window),
  });
  const availability = new ImmichAvailability({ client, network: browserNetworkStatus(window) });
  return { client, availability };
}
