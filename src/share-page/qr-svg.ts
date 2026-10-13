import { qrCodeOf } from "../app/share-link/qr-code";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

/** `text` as a QR code, an image named `label`; its colours come from the page's CSS (`.qr`). */
export function qrSvg(document: Document, text: string, label: string): SVGSVGElement {
  const { size, path } = qrCodeOf(text);
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", `0 0 ${String(size)} ${String(size)}`);
  svg.setAttribute("class", "qr");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", label);
  // Crisp module edges, so a phone reads the code from across the room.
  svg.setAttribute("shape-rendering", "crispEdges");
  const modules = document.createElementNS(SVG_NAMESPACE, "path");
  modules.setAttribute("d", path);
  svg.append(modules);
  return svg;
}
