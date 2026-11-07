import { describe, expect, it } from "vitest";
import type { ExportProgress } from "./export-job";
import { runningInHeader } from "./export-status";

const EXPORT: ExportProgress = { slideshowId: "device", title: "Herbst", fraction: 0.5 };
const FIRST_COPY: ExportProgress = { slideshowId: "a", title: "A", fraction: 0.1, copying: true };
const SECOND_COPY: ExportProgress = { slideshowId: "b", title: "B", fraction: 0.2, copying: true };

describe("runningInHeader", () => {
  it.each([
    { exported: null, copies: [], shown: [] },
    { exported: EXPORT, copies: [], shown: [EXPORT] },
    { exported: null, copies: [FIRST_COPY, SECOND_COPY], shown: [FIRST_COPY, SECOND_COPY] },
    {
      exported: EXPORT,
      copies: [FIRST_COPY, SECOND_COPY],
      shown: [EXPORT, FIRST_COPY, SECOND_COPY],
    },
  ])(
    "shows the export first, then each running copy in its order",
    ({ exported, copies, shown }) => {
      expect(runningInHeader(exported, copies)).toEqual(shown);
    },
  );
});
