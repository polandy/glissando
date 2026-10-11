import { probeCapabilities, type ExportCapabilities } from "../capabilities";
import { browserCapabilityProbe } from "./capability-probe";

/** What this browser can export, asked of it directly (video_export/CAPABILITIES.md). */
export function probeVideoExport({
  withMusic,
}: {
  readonly withMusic: boolean;
}): Promise<ExportCapabilities> {
  return probeCapabilities(browserCapabilityProbe(), { withMusic });
}
