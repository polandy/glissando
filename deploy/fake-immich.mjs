// A stand-in for Immich in deploy/test-image.sh: it answers every request with what arrived —
// method, path and the credential headers — plus a sign-in cookie of its own, as Immich sets on
// a login, and logs one line per request.
// Node's globals; the lint config does not know them for .mjs.
/* global console */
import { createServer } from "node:http";

const PORT = 2283;
const SIGN_IN_COOKIE = "immich_access_token=upstream-cookie; Path=/; HttpOnly";
const ECHOED_HEADERS = ["x-api-key", "cookie", "authorization", "x-immich-share-key"];

const server = createServer((request, response) => {
  const received = {
    method: request.method,
    url: request.url,
    headers: Object.fromEntries(
      ECHOED_HEADERS.map((name) => [name, request.headers[name] ?? null]),
    ),
  };
  const body = JSON.stringify(received);
  console.log(`request ${body}`);
  response.writeHead(200, { "content-type": "application/json", "set-cookie": SIGN_IN_COOKIE });
  response.end(body);
});

server.listen(PORT, () => console.log(`listening on ${PORT}`));
