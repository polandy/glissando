import { describe, expect, it } from "vitest";
import { SLIDESHOW_FORMAT_VERSION, type Slideshow } from "../player";
import {
  MEDIA_BLOCK_END,
  mediaBlockStart,
  PAGE_CONTENT_SECURITY_POLICY,
  pageHead,
  pageTail,
  type PageFrame,
} from "./page";
import type { PageCopy } from "./page-contract";

const COPY: PageCopy = {
  eyebrow: "Diashow",
  summary: "3 Bilder · 0:12 · mit Musik",
  madeWith: "Erstellt mit Glissando · läuft offline",
  play: "Abspielen",
  pause: "Pause",
  mute: "Ton aus",
  unmute: "Ton an",
  fullScreen: "Vollbild",
  timeline: "Zeitleiste",
  playAgain: "Nochmal abspielen",
  cannotPlay: "Diese Diashow lässt sich hier nicht abspielen.",
};

const HOSTILE = "</script><script>alert(1)</script><!--";

const SLIDESHOW: Slideshow = {
  formatVersion: SLIDESHOW_FORMAT_VERSION,
  title: "Rom",
  slides: [
    {
      image: { src: "p0", capturedAt: "2026-07-01T10:00:00Z" },
      durationMs: 4000,
      kenBurns: {
        from: { zoom: 1, centerX: 0.5, centerY: 0.5 },
        to: { zoom: 1.1, centerX: 0.5, centerY: 0.5 },
        easing: "linear",
      },
      caption: HOSTILE,
    },
  ],
};

function frame(overrides: Partial<PageFrame> = {}): PageFrame {
  return {
    lang: "de",
    title: "Rom & Neapel <2026>",
    noscript: "Diese Diashow braucht JavaScript.",
    copy: COPY,
    slideshow: SLIDESHOW,
    style: "body{margin:0}",
    captionFontDataUrl: "data:font/woff2;base64,AAAA",
    ...overrides,
  };
}

/** The text of the `<script>` with `id`, or a throw naming the id. */
function blockText(page: string, id: string): string {
  const start = page.indexOf(`id="${id}"`);
  if (start < 0) throw new Error(`the page has no block with id "${id}"`);
  const open = page.indexOf(">", start) + 1;
  return page.slice(open, page.indexOf("</script>", open));
}

describe("pageHead", () => {
  it("starts the page as HTML in the export's language, titled after the slideshow, escaped", () => {
    const head = pageHead(frame());

    expect(head.startsWith('<!doctype html>\n<html lang="de">')).toBe(true);
    expect(head).toContain("<title>Rom &amp; Neapel &lt;2026&gt;</title>");
  });

  it("allows only inline script and style and data:/blob: media, nothing from outside", () => {
    expect(PAGE_CONTENT_SECURITY_POLICY).toBe(
      "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
        "img-src data: blob:; media-src data: blob:; font-src data:; worker-src blob:",
    );
    expect(pageHead(frame())).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${PAGE_CONTENT_SECURITY_POLICY}">`,
    );
  });

  it("inlines the page style and the caption font as a data: URL", () => {
    const head = pageHead(frame());

    expect(head).toContain("body{margin:0}");
    expect(head).toContain(
      '@font-face{font-family:"Instrument Sans";font-weight:400 600;' +
        'src:url(data:font/woff2;base64,AAAA) format("woff2")}',
    );
  });

  it("holds the slideshow JSON so that no caption can close its script block", () => {
    const head = pageHead(frame());
    const json = blockText(head, "slideshow");

    expect(JSON.parse(json)).toEqual(SLIDESHOW);
    expect(json).not.toMatch(/<\/script|<!--/i);
  });

  it("holds the copy JSON, escaped the same way", () => {
    const head = pageHead(frame({ copy: { ...COPY, eyebrow: HOSTILE } }));
    const json = blockText(head, "copy");

    expect(JSON.parse(json)).toEqual({ ...COPY, eyebrow: HOSTILE });
    expect(json).not.toMatch(/<\/script|<!--/i);
  });

  it("tells a browser without JavaScript what the page needs, escaped", () => {
    expect(pageHead(frame({ noscript: "Braucht <JavaScript>" }))).toContain(
      "<noscript><p>Braucht &lt;JavaScript&gt;</p></noscript>",
    );
  });
});

describe("media blocks", () => {
  it("opens a block with the medium's key as id and its MIME type", () => {
    expect(mediaBlockStart("p3", "image/jpeg")).toBe(
      '<script type="application/octet-stream" id="p3" data-type="image/jpeg">',
    );
    expect(MEDIA_BLOCK_END).toBe("</script>\n");
  });
});

describe("pageTail", () => {
  it("runs the player script after every data block and ends the document", () => {
    expect(pageTail("start()")).toBe("<script>start()</script>\n</body>\n</html>\n");
  });

  it.each(["</script>", "</Script", "<!--"])(
    "refuses a player script holding %j rather than rewriting the script",
    (sequence) => {
      expect(pageTail("start()")).toContain("start()");
      expect(() => pageTail(`const html = "${sequence}";`)).toThrow(/cannot be inlined/);
    },
  );
});
