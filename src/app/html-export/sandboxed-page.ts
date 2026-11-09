/** Scripts run, but in an opaque origin: no access to the app's storage, DOM or cookies. */
const PAGE_SANDBOX = "allow-scripts";
// "*": a bare feature only matches the src origin, never the frame's opaque one in Firefox and WebKit.
const PAGE_PERMISSIONS = "fullscreen *; autoplay *";

/** Shows an exported page in `document` (a fresh tab) inside a sandboxed frame that fills it. */
export function showSandboxedPage(
  document: Document,
  pageUrl: string,
  title: string,
): HTMLIFrameElement {
  document.title = title;
  const { body } = document;
  body.style.margin = "0";
  body.style.height = "100vh";
  const frame = document.createElement("iframe");
  frame.setAttribute("sandbox", PAGE_SANDBOX);
  frame.allow = PAGE_PERMISSIONS;
  frame.title = title;
  frame.style.border = "0";
  frame.style.display = "block";
  frame.style.width = "100%";
  frame.style.height = "100%";
  frame.src = pageUrl;
  body.append(frame);
  frame.focus();
  return frame;
}
