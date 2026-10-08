type RequestLike = Pick<Request, "url" | "mode">;

export interface RespondPorts<R extends RequestLike> {
  /** The cached `index.html` every navigation is answered with. */
  readonly indexUrl: string;
  /** Looks in every cache, so a tab of the previous version still finds its files. */
  match(url: string): Promise<Response | undefined>;
  fetch(request: R): Promise<Response>;
}

const NAVIGATION: RequestMode = "navigate";

/** Cache first: the network only for what no cache holds (ADR-0005). */
export async function respond<R extends RequestLike>(
  request: R,
  ports: RespondPorts<R>,
): Promise<Response> {
  const url = request.mode === NAVIGATION ? ports.indexUrl : request.url;
  return (await ports.match(url)) ?? ports.fetch(request);
}
