<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { StoredCard } from "../../../../library/stored-slideshow";
  import { getTranslator } from "../../../i18n/context";
  import type { MotionPreviewPorts } from "../../../picture-editor/motion-preview";
  import type { Fonts } from "../../../../player/fonts";
  import type { PictureTile } from "../../view-models";
  import CardFace from "./CardFace.svelte";
  import {
    CARD_PREVIEW_PLAY_MS,
    CARD_PREVIEW_SETTLED_MS,
    pictureUrlFor,
    previewFace,
  } from "./card-preview-model";
  import { PreviewPlayer } from "./preview-play";

  /**
   * The card sheet's sticky 16:9 preview (TITLE_SLIDES.md): its enter phase plays once when the
   * sheet opens; afterwards an edit shows the settled state at once, never replayed. Play alone
   * runs the full timing again. `fonts` defaults to the real `document.fonts`; a test passes a
   * fake it settles on its own terms.
   */
  let {
    card,
    pictures,
    previewPorts,
    reducedMotion,
    fonts = document.fonts,
  }: {
    card: StoredCard;
    pictures: readonly PictureTile[];
    previewPorts: MotionPreviewPorts;
    reducedMotion: boolean;
    fonts?: Fonts;
  } = $props();

  const { t } = getTranslator();

  let elapsedMs = $state(CARD_PREVIEW_SETTLED_MS);
  let playing = $state(false);
  // Fixed for the sheet's lifetime; a test passes its own fake ports once, at mount.
  const player = new PreviewPlayer();
  let firstCardEffect = true;

  function playTo(targetMs: number): void {
    if (reducedMotion) {
      elapsedMs = targetMs;
      return;
    }
    playing = true;
    player.play(previewPorts, targetMs, (next) => {
      elapsedMs = next;
      if (next >= targetMs) {
        playing = false;
      }
    });
  }

  onMount(() => playTo(CARD_PREVIEW_SETTLED_MS));
  onDestroy(() => player.stop());

  // An edit to the card jumps the preview straight back to its settled look, never replayed;
  // the very first run (the sheet opening) is the mount's own job, played above instead.
  $effect(() => {
    void card;
    if (firstCardEffect) {
      firstCardEffect = false;
      return;
    }
    player.stop();
    playing = false;
    elapsedMs = CARD_PREVIEW_SETTLED_MS;
  });

  function play(): void {
    playTo(card.motion ? CARD_PREVIEW_PLAY_MS : CARD_PREVIEW_SETTLED_MS);
  }

  const face = $derived(previewFace(card, pictures));
  const pictureUrl = $derived(
    face.pictureId === undefined ? undefined : pictureUrlFor(pictures, face.pictureId),
  );
</script>

<div class="preview">
  <div class="stage">
    <CardFace
      card={face.card}
      ground={face.ground}
      {pictureUrl}
      {elapsedMs}
      {reducedMotion}
      {fonts}
    />
  </div>
  <button class="btn small ghost play" type="button" disabled={playing} onclick={play}>
    {t("player.play")}
  </button>
</div>

<style>
  .preview {
    position: sticky;
    top: 0;
    z-index: 1;
    display: grid;
    gap: 8px;
    padding-bottom: 4px;
    background: var(--gl-surface);
  }
  .stage {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
  }
  .play {
    justify-self: start;
  }
</style>
