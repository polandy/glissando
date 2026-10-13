import { describe, expect, it } from "vitest";
import { remoteSecret } from "./remote-page-contract";
import { REMOTE_PAGE_CONTENT_SECURITY_POLICY, remotePageHtml } from "./remote-page-html";
import { REMOTE_TEXT_KEYS, type RemotePageWords } from "./remote-page-words";

function words(noscript: string): RemotePageWords {
  return {
    ...(Object.fromEntries(REMOTE_TEXT_KEYS.map((key) => [key, "word"])) as RemotePageWords),
    endedTitle: "</script><b>",
    noscript,
  };
}

const PAGE = remotePageHtml({
  languages: { de: words("Braucht JavaScript."), en: words("Needs JavaScript.") },
  fontFaces: '@font-face{font-family:"Instrument Sans";src:url(data:font/woff2;base64,AAAA)}',
  style: ".remote{display:grid}",
  script: "console.log('remote page');",
});

describe("remotePageHtml", () => {
  it("lets the page reach only its own origin, for the stream and the commands", () => {
    expect(PAGE).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${REMOTE_PAGE_CONTENT_SECURITY_POLICY}">`,
    );
    expect(REMOTE_PAGE_CONTENT_SECURITY_POLICY).toBe(
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
        "font-src data:; connect-src 'self'",
    );
  });

  it("sends no referrer, which would carry the secret on", () => {
    expect(PAGE).toContain('<meta name="referrer" content="no-referrer">');
  });

  it("holds both languages' words, with no word able to end its block", () => {
    expect(PAGE).toContain('<script type="application/json" id="remote-words">');
    expect(PAGE).toContain("\\u003c/script>\\u003cb>");
    expect(PAGE).not.toContain("</script><b>");
  });

  it("tells a browser without JavaScript in both languages", () => {
    expect(PAGE).toContain("Braucht JavaScript.");
    expect(PAGE).toContain("Needs JavaScript.");
  });

  it("loads nothing from anywhere: style, fonts and script are inline", () => {
    expect(PAGE).toContain("<script>console.log('remote page');</script>");
    expect(PAGE).toContain("url(data:font/woff2;base64,AAAA)");
    expect(PAGE).toContain(".remote{display:grid}");
    expect(PAGE).not.toMatch(/\s(src|href)=/);
  });

  it("refuses a script that cannot be inlined unchanged", () => {
    expect(() =>
      remotePageHtml({
        languages: { de: words(""), en: words("") },
        fontFaces: "",
        style: "",
        script: "const end = '</script>';",
      }),
    ).toThrow();
  });
});

describe("remoteSecret", () => {
  it.each([
    { path: "/r/AbCdEfGhIjKlMnOpQr-_Uv", secret: "AbCdEfGhIjKlMnOpQr-_Uv" },
    { path: "/r/AbCdEfGhIjKlMnOpQrStUv/", secret: "AbCdEfGhIjKlMnOpQrStUv" },
    { path: "/r/AbCdEfGhIjKlMnOpQrStU", secret: null },
    { path: "/r/AbCdEfGhIjKlMnOpQrStUvW", secret: null },
    { path: "/r/AbCdEfGhIjKlMnOpQrSt.v", secret: null },
    { path: "/r/", secret: null },
    { path: "/remote.html", secret: null },
  ])("reads $secret from $path", ({ path, secret }) => {
    expect(remoteSecret(path)).toBe(secret);
  });
});
