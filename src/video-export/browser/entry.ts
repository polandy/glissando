import { probeCapabilities, type ExportCapabilities } from "../capabilities";
import { browserCapabilityProbe } from "./capability-probe";

/** What this browser can export, asked of it directly (VIDEO_EXPORT.md, Capabilities). */
export function probeVideoExport({
  withMusic,
}: {
  readonly withMusic: boolean;
}): Promise<ExportCapabilities> {
  return probeCapabilities(browserCapabilityProbe(), { withMusic });
}
