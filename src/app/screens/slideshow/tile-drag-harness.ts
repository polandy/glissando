import { FakeFrameScheduler } from "../../../player/testing/fakes";
import { FakeScheduler } from "../../../ui-kit/testing/fake-scheduler";
import { TileDrag } from "./tile-drag";
import type { DropTarget, TileDragPorts } from "./tile-drag-types";

const ORDER = ["a", "b", "c", "d"];
export const VIEWPORT = { top: 0, bottom: 600 };
/** The pointer driving each gesture; a second one is `OTHER_FINGER`. */
export const FINGER = 1;
export const OTHER_FINGER = 2;
export const SECONDARY_BUTTON = 2;

export function harness(overrides: Partial<TileDragPorts> = {}) {
  const holdScheduler = new FakeScheduler();
  const frameScheduler = new FakeFrameScheduler();
  const calls = {
    held: [] as string[],
    changes: 0,
    scrolledBy: [] as number[],
    dropped: [] as [readonly string[], number][],
    suppressedClicks: 0,
  };
  let hitResult: DropTarget | null = null;
  let selected = new Set<string>();
  let order: readonly string[] = ORDER;
  let viewportEdges = VIEWPORT;
  const ports: TileDragPorts = {
    holdScheduler,
    frameScheduler,
    hitTest: () => hitResult,
    viewportEdges: () => viewportEdges,
    selection: () => selected,
    order: () => order,
    onHold: (pictureId) => calls.held.push(pictureId),
    onChange: () => (calls.changes += 1),
    onScrollBy: (px) => calls.scrolledBy.push(px),
    onDrop: (groupIds, insertion) => calls.dropped.push([groupIds, insertion]),
    onSuppressClick: () => (calls.suppressedClicks += 1),
    ...overrides,
  };
  return {
    drag: new TileDrag(ports),
    holdScheduler,
    frameScheduler,
    calls,
    setHit: (hit: DropTarget | null) => (hitResult = hit),
    setSelected: (ids: readonly string[]) => (selected = new Set(ids)),
    setOrder: (next: readonly string[]) => (order = next),
    setViewportEdges: (edges: typeof VIEWPORT) => (viewportEdges = edges),
  };
}
