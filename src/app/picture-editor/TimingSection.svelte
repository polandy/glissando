<script lang="ts">
  import type { TransitionChoice } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import ResetButton from "../components/ResetButton.svelte";
  import SectionHead from "../components/SectionHead.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MotionPreviewPorts } from "./motion-preview";
  import type { PictureEditorView } from "./picture-editor-view";
  import PictureLengthSlider from "./PictureLengthSlider.svelte";
  import TransitionPicker from "./TransitionPicker.svelte";

  /**
   * How long the picture shows and how it hands over to the next: each automatic until the user
   * picks a value, with one way back for both.
   */
  let {
    picture,
    pictureUrl,
    nextPictureUrl,
    ports,
    reducedMotion,
    onDuration,
    onTransition,
    onReset,
  }: {
    picture: PictureEditorView;
    pictureUrl: string | null;
    nextPictureUrl: string | null;
    /** The transition tiles' loop runs on these. */
    ports: MotionPreviewPorts;
    reducedMotion: boolean;
    /** An own duration in whole milliseconds, on the half-second grid. */
    onDuration: (durationMs: number) => void;
    onTransition: (choice: TransitionChoice) => void;
    /** Duration and transition back to automatic, together. */
    onReset: () => void;
  } = $props();

  const { t, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number) => formatTenthSeconds(ms / MILLISECONDS_PER_SECOND);

  const own = $derived(picture.ownDuration || picture.transition.own);
  const automaticMs = $derived(
    picture.durationBasis.kind === "seconds-per-picture" ? picture.durationBasis.automaticMs : null,
  );

  const hint = $derived.by(() => {
    const basis = picture.durationBasis;
    if (basis.kind === "seconds-per-picture") {
      return picture.ownDuration
        ? t("editor.durationHintOwn", { duration: seconds(basis.automaticMs) })
        : t("editor.durationHintAutomatic");
    }
    if (!picture.ownDuration) {
      return t("editor.durationHintMusic", { count: basis.automaticCount });
    }
    if (basis.shareMs === null) {
      return t("editor.durationHintAllOwn");
    }
    const key = basis.clamped ? "editor.durationHintMusicClamped" : "editor.durationHintMusicOwn";
    return t(key, { count: basis.automaticCount, share: seconds(basis.shareMs) });
  });
</script>

<section class="timing" aria-labelledby="timing-label">
  <SectionHead
    id="timing-label"
    title={t("editor.timing")}
    stateText={own ? t("editor.ownTiming") : t("editor.automatic")}
    {own}
  />
  <PictureLengthSlider durationMs={picture.durationMs} {automaticMs} {onDuration} />
  <p class="hint">{hint}</p>
  <TransitionPicker {picture} {pictureUrl} {nextPictureUrl} {ports} {reducedMotion} {onTransition} />
  <ResetButton
    automatic={!own}
    alreadyAutomatic={t("editor.timingAlreadyAutomatic")}
    {onReset}
    wide
  />
</section>

<style>
  .timing {
    display: grid;
    gap: 12px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
</style>
