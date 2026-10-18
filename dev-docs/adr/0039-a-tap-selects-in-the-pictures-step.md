# ADR-0039: A tap selects in the pictures step, as in the editor

**Status:** accepted

## Context

The import's pictures step showed its strip tiles as buttons: a tap opened the picture full
screen, ✕ removed it. Arranging there (IMPORT_ARRANGING.md) brings the editor's strip, where a
tap selects and the selection bar acts on what is selected. Two meanings of one tap on two
strips that look alike would make a user who learnt one stumble in the other.

Options weighed:

- **Tap views, hold selects** in the step, tap selects in the editor: viewing stays one tap
  away, but the two strips disagree and selecting several takes a hold first.
- **Tap selects everywhere**, viewing through the bar's View, F or a double-click: one strip
  behaviour, at the cost of one more tap to look at a picture.
- **Tap views everywhere**, the editor changed to match: the editor's tested select-and-arrange
  flow would change for a gain only in the step.

## Decision

A tap selects in the pictures step and in "Add media", as in the editor. The selection bar has
View where the editor has Edit; F on a focused tile and a double-click with a mouse open the
viewer too, and F does so in the editor as well. On touch the tile ✕ goes; Remove sits in the
bar. Set-aside tiles keep a tap that views, since they cannot be selected. The editor's own
behaviour is unchanged.

## Consequences

- Looking at one picture takes two taps on touch (select, View) where it took one.
- One strip component, one set of keys and one viewer serve the step, "Add media" and the
  editor; the viewer leaves `import/` for `components/`.
