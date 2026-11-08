import { afterEach, describe, expect, it } from "vitest";
import { showSandboxedPage } from "./sandboxed-page";

interface PageReport {
  readonly origin: string;
  readonly canReachApp: boolean;
  readonly fullscreenEnabled: boolean;
}

/** An exported page stand-in that reports what it may reach, once its script ran. */
const REPORTING_PAGE = `<!doctype html><script>
  let canReachApp = true;
  try { parent.document; } catch { canReachApp = false; }
  parent.postMessage({ origin: self.origin, canReachApp, fullscreenEnabled: document.fullscreenEnabled }, "*");
</script>`;

const urls: string[] = [];
const tabs: HTMLIFrameElement[] = [];

afterEach(() => {
  for (const tab of tabs.splice(0)) tab.remove();
  for (const url of urls.splice(0)) URL.revokeObjectURL(url);
});

/** A same-origin blank document standing in for the tab "Open" creates. */
function blankTab(): Window {
  const tab = document.createElement("iframe");
  tab.allowFullscreen = true;
  document.body.append(tab);
  tabs.push(tab);
  if (tab.contentWindow === null) throw new Error("the stand-in tab has no window");
  return tab.contentWindow;
}

function reportingPageUrl(): string {
  const url = URL.createObjectURL(new Blob([REPORTING_PAGE], { type: "text/html" }));
  urls.push(url);
  return url;
}

function reportFrom(tab: Window, frame: HTMLIFrameElement): Promise<PageReport> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<PageReport>) => {
      if (event.source !== frame.contentWindow) return;
      tab.removeEventListener("message", onMessage);
      resolve(event.data);
    };
    tab.addEventListener("message", onMessage);
  });
}

describe("showSandboxedPage", () => {
  it("runs the page's script in an opaque origin, away from the app's", async () => {
    const tab = blankTab();

    const frame = showSandboxedPage(tab.document, reportingPageUrl(), "Holiday.html");
    const report = await reportFrom(tab, frame);

    expect(report.origin).toBe("null");
    expect(report.canReachApp).toBe(false);
  });

  it("lets the page go full screen", async () => {
    const tab = blankTab();

    const frame = showSandboxedPage(tab.document, reportingPageUrl(), "Holiday.html");

    expect((await reportFrom(tab, frame)).fullscreenEnabled).toBe(true);
  });

  it("names the tab after the page file", () => {
    const tab = blankTab();

    showSandboxedPage(tab.document, "about:blank", "Holiday.html");

    expect(tab.document.title).toBe("Holiday.html");
  });
});
