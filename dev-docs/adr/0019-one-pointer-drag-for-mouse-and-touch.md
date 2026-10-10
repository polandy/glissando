# ADR-0019: Picture tiles are dragged with one pointer-event drag, for mouse and touch alike

**Status:** accepted

## Context

The slideshow screen's tiles were dragged with the browser's native drag and drop, for a mouse
only: a native drag never starts from a finger on Android or iOS, so touch reordered with the
selection bar's Earlier and Later alone. Moving several pictures together (dev-docs/APP.md,
Select and reorder) adds a group drag, and the owner asked for it on the phone too: hold a
tile, then drag. Native drag and drop cannot do that, so the touch drag needs its own code.

## Decision

**One drag built on pointer events serves both pointers** (`screens/slideshow/tile-drag.ts`,
pure and driven by the strip):

- **A mouse** starts dragging once the pointer moves 8 px with the primary button held on a
  tile; a right- or middle-press starts nothing.
- **A finger** first holds the tile still for 450 ms. The tile then lifts and is selected
  (selecting several starts). Moving on drags; letting go in place only selects. Until the
  lift, the finger scrolls as usual. From the lift on, the strip cancels `touchmove`, so the
  page stays put under the finger.
- **One pointer drives a gesture**: the pointer that started it moves, drops or cancels it;
  a second finger touching down meanwhile is ignored.
- **The group** is the selection when the dragged tile is part of it, otherwise that tile
  alone. A stack of up to three thumbnails with the count follows the pointer. The dashed
  lemon line marks where the group lands, together, in play order.
- **Near the viewport's top or bottom edge** the page scrolls along, faster the closer the
  pointer is.
- **Timing comes in as seams**: the hold timer and the auto-scroll frames come from an
  injected scheduler, and hit-testing from an injected function. Tests drive the drag without
  waiting.

The drop goes through the editor's `moveGroup(pictureIds, insertion)`. Earlier, Later and
Shift+arrows go through `shiftGroup(pictureIds, offset)`. A scattered group first gathers where
its first picture is (Earlier) or its last (Later), the same block a drop makes; after that the
block moves. The order logic is pure (`src/library/group-order.ts`).

## Options weighed

- _Native drag and drop for a mouse, pointer events for touch only_: rejected. That means two
  drags with two drop marks and two sets of tests, and the native drag image cannot show the
  group's count across browsers (`setDragImage` from an off-screen element is unreliable in
  Safari).
- _A sortable library (SortableJS)_: rejected. It is a dependency for one grid, it manages the
  DOM order behind Svelte's keyed list, and it brings its own timing, which a test cannot
  drive.
- _Keep gaps_: Earlier and Later step each selected picture past its neighbour, so the gaps stay
  until the group reaches an end. Rejected by the owner. On a phone without a drag, it never
  brings scattered pictures together.

## Consequences

- The tiles lose `draggable`. Touch and mouse share the drop line, the stack and the moves.
- A finger held on a tile no longer opens the browser's image menu: the strip cancels
  `contextmenu` on touch.
- The tiles stay the same elements while a finger is down (a keyed list, updated in place). A
  finger's events go to the element it went down on, and a replaced element would swallow the
  rest of the drag.
