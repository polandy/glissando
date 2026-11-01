<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import SectionHead from "../components/SectionHead.svelte";
  import type { PictureEditorView } from "./picture-editor-view";

  /**
   * Whether the picture ever shares a slide with another one (ADR-0028): "Always alone" keeps
   * it single; the status line says what actually happens, including while the slideshow's
   * portrait pictures setting overrides the switch.
   */
  let {
    picture,
    onAlone,
  }: {
    picture: PictureEditorView;
    onAlone: (alone: boolean) => void;
  } = $props();

  const { t } = getTranslator();

  const status = $derived.by(() => {
    const { layout } = picture;
    if (layout.settingOverride !== null) {
      return t("editor.layoutSettingOverrides", {
        setting: t(`portrait.choice-${layout.settingOverride}`),
      });
    }
    if (layout.pairedWithNumber !== null) {
      return t("editor.layoutPaired", { number: layout.pairedWithNumber });
    }
    return layout.blurredFill ? t("editor.layoutBlurredFill") : t("editor.layoutAlone");
  });
</script>

<section class="layout" aria-labelledby="layout-label">
  <div class="row">
    <SectionHead id="layout-label" title={t("editor.layoutTitle")} own={picture.layout.alone} />
    <label class="switch">
      <input
        type="checkbox"
        role="switch"
        checked={picture.layout.alone}
        onchange={(event) => onAlone(event.currentTarget.checked)}
      />
      <span class="track" aria-hidden="true"></span>
      <span class="name">{t("editor.alwaysAlone")}</span>
    </label>
  </div>
  <p class="hint">{t("editor.alwaysAloneHint")}</p>
  <p class="status" aria-live="polite">{status}</p>
</section>

<style>
  .layout {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-medium);
  }
  @media (pointer: coarse) {
    .switch {
      min-height: var(--gl-hit-min);
    }
  }
  .switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .track {
    position: relative;
    flex: none;
    width: 38px;
    height: 22px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-line);
    transition: background-color 0.15s;
  }
  .track::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-surface);
    box-shadow: var(--gl-shadow);
    transition: transform 0.15s;
  }
  .switch input:checked + .track {
    background: var(--gl-accent);
  }
  .switch input:checked + .track::after {
    transform: translateX(16px);
  }
  .switch input:focus-visible + .track {
    outline: 2px solid var(--gl-accent);
    outline-offset: 2px;
  }
  .hint {
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.4;
  }
  .status {
    margin: 0;
    padding: 8px 10px;
    border-radius: var(--gl-radius);
    background: var(--gl-hover);
    font-size: var(--gl-size-meta);
  }
  @media (prefers-reduced-motion: reduce) {
    .track,
    .track::after {
      transition: none;
    }
  }
</style>
