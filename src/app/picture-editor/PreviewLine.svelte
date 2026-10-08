<script lang="ts">
  import { CUT_TRANSITION } from "../../library/own-timing";
  import { MILLISECONDS_PER_SECOND } from "../../player";
  import { getTranslator } from "../i18n/context";
  import type { PictureEditorView } from "./picture-editor-view";

  /** Under the preview, what it plays: the picture's duration and what follows it. */
  let { picture }: { picture: PictureEditorView } = $props();

  const { t, formatTenthSeconds } = getTranslator();
  const seconds = (ms: number) => formatTenthSeconds(ms / MILLISECONDS_PER_SECOND);

  const line = $derived.by(() => {
    const duration = seconds(picture.durationMs);
    const next = picture.number + 1;
    if (picture.next === null) {
      return t("editor.previewEnd", { duration });
    }
    const { choice, durationMs } = picture.transition;
    if (choice === CUT_TRANSITION) {
      return t("editor.previewCut", { duration, next });
    }
    return t("editor.previewTransition", {
      duration,
      effect: t(`effect.${choice}`),
      length: seconds(durationMs),
      next,
    });
  });
</script>

<p class="preview-line">
  <b>{t("editor.crumb", { number: picture.number })}</b> · {line}
</p>

<style>
  .preview-line {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    line-height: 1.4;
  }
  b {
    color: var(--gl-ink);
    font-weight: var(--gl-weight-semibold);
  }
</style>
