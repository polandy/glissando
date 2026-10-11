import { describe, expect, it } from "vitest";
import { shareToken } from "./share-page-contract";
import { SHARE_PAGE_CONTENT_SECURITY_POLICY, sharePageHtml } from "./share-page-html";
import type { SharePageWords } from "./share-page-words";

function words(noscript: string): SharePageWords {
  const word = "word";
  return {
    eyebrow: word,
    summary: word,
    pictures: { one: word, other: word },
    withMusic: word,
    withoutMusic: word,
    madeWith: word,
    play: word,
    pause: word,
    mute: word,
    unmute: word,
    fullScreen: word,
    timeline: word,
    playAgain: word,
    cannotPlay: word,
    loadingFirst: word,
    loadingLate: word,
    goneTitle: "</script><b>",
    goneText: word,
    unreachableTitle: word,
    unreachableText: word,
    tryAgain: word,
    noscript,
  };
}

const PAGE = sharePageHtml({
  languages: { de: words("Braucht JavaScript."), en: words("Needs JavaScript.") },
  style: ".stage{inset:0}",
  captionFontDataUrl: "data:font/woff2;base64,AAAA",
  script: "console.log('share page');",
});

describe("sharePageHtml", () => {
  it("lets the page reach its own origin for the slideshow, its pictures and songs", () => {
    expect(PAGE).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${SHARE_PAGE_CONTENT_SECURITY_POLICY}">`,
    );
    for (const directive of [
      "connect-src 'self' blob:",
      "img-src 'self' data: blob:",
      "media-src 'self' data: blob:",
      "default-src 'none'",
    ]) {
      expect(SHARE_PAGE_CONTENT_SECURITY_POLICY).toContain(directive);
    }
  });

  it("keeps every source of the export page's policy and adds only the page's own origin", () => {
    expect(SHARE_PAGE_CONTENT_SECURITY_POLICY).toBe(
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
        "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src data:; " +
        "worker-src blob:; connect-src 'self' blob:",
    );
  });

  it("holds both languages' words, with no word able to end its block", () => {
    expect(PAGE).toContain('<script type="application/json" id="share-words">');
    expect(PAGE).toContain("\\u003c/script>\\u003cb>");
    expect(PAGE).not.toContain("</script><b>");
  });

  it("tells a browser without JavaScript in both languages", () => {
    expect(PAGE).toContain("Braucht JavaScript.");
    expect(PAGE).toContain("Needs JavaScript.");
  });

  it("loads nothing from anywhere: style, font and script are inline", () => {
    expect(PAGE).toContain("<script>console.log('share page');</script>");
    expect(PAGE).toContain("url(data:font/woff2;base64,AAAA)");
    expect(PAGE).not.toMatch(/\s(src|href)=/);
  });
});

describe("shareToken", () => {
  it.each([
    { path: "/s/AbCdEfGhIjKlMnOpQrStUv", token: "AbCdEfGhIjKlMnOpQrStUv" },
    { path: "/s/AbCdEfGhIjKlMnOpQrStUv/", token: "AbCdEfGhIjKlMnOpQrStUv" },
    { path: "/s/", token: null },
    { path: "/s/a/b", token: null },
    { path: "/share.html", token: null },
  ])("reads $token from $path", ({ path, token }) => {
    expect(shareToken(path)).toBe(token);
  });
});
