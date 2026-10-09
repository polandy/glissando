import { HttpImmichClient } from "../http-immich-client";
import { ImmichUnavailableError, type ImmichUnavailableKind } from "../immich-client";

export const BASE = "https://glissando.example/app/immich/";

export interface RecordedRequest {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
  readonly headers: Headers;
  readonly redirect: RequestRedirect | undefined;
}

export type FakeAnswer = () => Response;

/** Answers by "METHOD url"; an unknown request fails the test loudly. */
export class FakeFetch {
  readonly requests: RecordedRequest[] = [];
  readonly #answers = new Map<string, FakeAnswer>();

  answer(method: string, path: string, answer: FakeAnswer): this {
    this.#answers.set(`${method} ${BASE}${path}`, answer);
    return this;
  }

  readonly fetch: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    this.requests.push({
      method,
      url,
      body,
      headers: new Headers(init?.headers),
      redirect: init?.redirect,
    });
    const answer = this.#answers.get(`${method} ${url}`);
    if (answer === undefined) {
      return Promise.reject(new Error(`the fake fetch has no answer for ${method} ${url}`));
    }
    try {
      return Promise.resolve(answer());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

export const json =
  (body: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const html =
  (status = 200) =>
  () =>
    new Response("<!doctype html><title>Glissando</title>", {
      status,
      headers: { "content-type": "text/html" },
    });

export const status = (code: number) => () => new Response("", { status: code });

export const networkDown = () => {
  throw new TypeError("Failed to fetch");
};

/** What `fetch` resolves to for a redirect under `redirect: "manual"`. */
export const opaqueRedirect = () => {
  const response = new Response(null, { status: 200 });
  Object.defineProperty(response, "type", { value: "opaqueredirect" });
  Object.defineProperty(response, "status", { value: 0 });
  Object.defineProperty(response, "ok", { value: false });
  return response;
};

export function clientWith(fake: FakeFetch): HttpImmichClient {
  return new HttpImmichClient({ baseUrl: BASE, fetch: fake.fetch });
}

export async function unavailableKind(promise: Promise<unknown>): Promise<ImmichUnavailableKind> {
  const error: unknown = await promise.then(
    () => new Error("expected the request to fail"),
    (rejection: unknown) => rejection,
  );
  if (!(error instanceof ImmichUnavailableError)) {
    throw new Error(`expected an ImmichUnavailableError, got ${String(error)}`);
  }
  return error.kind;
}
