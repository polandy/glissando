/** Fetches the place list as text; a non-2xx answer throws instead of being parsed as data. */
export async function fetchPlaceText(
  fetchUrl: (url: string) => Promise<Pick<Response, "ok" | "status" | "text">>,
  url: string,
): Promise<string> {
  const response = await fetchUrl(url);
  if (!response.ok) {
    throw new Error(`Place data ${url} answered ${response.status}`);
  }
  return response.text();
}
