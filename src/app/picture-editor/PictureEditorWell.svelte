<script lang="ts">
  import type { OwnKenBurns } from "../../library/own-ken-burns";
  import type { Framing, Rect, Size } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { FocusIndication } from "./focus-indication";
  import FrameWell from "./FrameWell.svelte";
  import type { FrameKey } from "./frame-keys";
  import ViewSwitch, { type PhoneView } from "./ViewSwitch.svelte";

  /**
   * The editor's picture column: the frame well, its hint and, on a phone, the switch to the
   * preview. On a phone the column is hidden while the preview is shown.
   */
  let {
    size,
    pictureUrl,
    alt,
    motion,
    active,
    playhead,
    focus,
    reducedMotion,
    phoneView,
    onActivate,
    onFraming,
    onView,
  }: {
    size: Size;
    pictureUrl: string | null;
    alt: string;
    motion: OwnKenBurns;
    active: FrameKey;
    playhead: Rect | null;
    focus: FocusIndication;
    reducedMotion: boolean;
    phoneView: PhoneView;
    onActivate: (key: FrameKey) => void;
    onFraming: (key: FrameKey, framing: Framing, final: boolean) => void;
    onView: (view: PhoneView) => void;
  } = $props();
  const { t } = getTranslator();
</script>

<div class="well-column" class:off-phone={phoneView !== "frame"}>
  <FrameWell
    {size}
    {pictureUrl}
    {alt}
    {motion}
    {active}
    {playhead}
    {focus}
    {reducedMotion}
    {onActivate}
    {onFraming}
  />
  <p class="hint wide-hint">{t("editor.hintWide")}</p>
  <ViewSwitch view={phoneView} {onView} />
</div>

<style>
  .well-column {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto auto;
    gap: 10px;
    min-height: 0;
    padding: 18px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    text-align: center;
  }
  @container (max-width: 720px) {
    /* The picture or the preview, never both: the shown one stays in view as the page scrolls. */
    .well-column {
      position: sticky;
      top: 0;
      z-index: 3;
      gap: 0;
      padding: 0 0 12px;
      border-bottom: 1px solid var(--gl-line);
      background: var(--gl-surface);
    }
    .well-column.off-phone {
      display: none;
    }
    .well-column > :global(.view-switch) {
      margin: 10px 16px 0;
    }
    .wide-hint {
      display: none;
    }
  }
</style>
