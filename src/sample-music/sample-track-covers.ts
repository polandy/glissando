import holdTheFrame from "./covers/hold-the-frame.svg?url";
import throughTheRainSlickedGlass from "./covers/through-the-rain-slicked-glass.svg?url";
import beforeTheWorldAwakens from "./covers/before-the-world-awakens.svg?url";
import sevenFloorsAbove from "./covers/seven-floors-above.svg?url";
import morningLatitude from "./covers/morning-latitude.svg?url";
import topDownCruising from "./covers/top-down-cruising.svg?url";
import arrivalAtDawn from "./covers/arrival-at-dawn.svg?url";
import whereTheMountainsMeet from "./covers/where-the-mountains-meet.svg?url";
import theViewFromTheSummit from "./covers/the-view-from-the-summit.svg?url";
import type { SampleTrackId } from "./sample-tracks.ts";

/**
 * Bundled so the cover grid works offline (ADR-0042); copied verbatim from
 * polandy/glissando-assets music/covers/. The Record keeps every id matched to a cover.
 */
export const SAMPLE_TRACK_COVER_URLS: Readonly<Record<SampleTrackId, string>> = {
  "hold-the-frame": holdTheFrame,
  "through-the-rain-slicked-glass": throughTheRainSlickedGlass,
  "before-the-world-awakens": beforeTheWorldAwakens,
  "seven-floors-above": sevenFloorsAbove,
  "morning-latitude": morningLatitude,
  "top-down-cruising": topDownCruising,
  "arrival-at-dawn": arrivalAtDawn,
  "where-the-mountains-meet": whereTheMountainsMeet,
  "the-view-from-the-summit": theViewFromTheSummit,
};
