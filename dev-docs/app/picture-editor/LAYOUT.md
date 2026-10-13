# Layout

- **Layout** (`LayoutSection.svelte`, ADR-0028): the eyebrow "Layout" and a switch "Always
  alone" (`role="switch"`), its hint "This picture never shares a slide with another one.",
  and a status line (announced politely) that always says what actually happens:
  - the slideshow's portrait pictures setting is not automatic: "Has no effect while the
    slideshow is set to \"One at a time\"/\"Fill the screen\" — there, every picture is shown
    alone." The switch still toggles the picture's own flag, kept for when the setting goes
    back to automatic.
  - otherwise, paired with another portrait picture: "Shares a slide with picture 4".
  - otherwise, shown alone over a blurred fill because a wide screen would crop too much of it:
    "Shown alone over a blurred copy of itself on a wide screen."
  - otherwise (shown alone by nature, or by the switch): "Shown alone."
- Toggling the switch calls `SlideshowEditor.setPictureAlone`, applied at once; no own toast
  (the slideshow's "always alone" flag has no automatic default to undo back to, unlike the
  motion, duration and transition sections).
