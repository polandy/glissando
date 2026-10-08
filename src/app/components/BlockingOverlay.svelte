<script lang="ts">
  import { getTranslator } from "../i18n/context";

  /**
   * Only while the next screen cannot exist without the result; title and line are required.
   * With `progress` (0 to 1) a bar replaces the spinner, `note` names what is being worked on
   * and `onCancel` offers Cancel.
   */
  let {
    title,
    detail,
    progress,
    note,
    onCancel,
  }: {
    title: string;
    detail: string;
    progress?: number | undefined;
    note?: string | undefined;
    onCancel?: (() => void) | undefined;
  } = $props();

  const PERCENT = 100;
  const { t } = getTranslator();
</script>

<div class="overlay" role="alertdialog" aria-modal="true" aria-busy="true" aria-label={title}>
  <div class="box" class:measured={progress !== undefined}>
    {#if progress === undefined}
      <div class="ring spinner" aria-hidden="true"></div>
    {/if}
    <h3>{title}</h3>
    <small>{detail}</small>
    {#if progress !== undefined}
      <div
        class="meter"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax={PERCENT}
        aria-valuenow={Math.round(progress * PERCENT)}
      >
        <i style:width="{progress * PERCENT}%"></i>
      </div>
    {/if}
    {#if note !== undefined || onCancel}
      <div class="row">
        <span class="note mono">{note ?? ""}</span>
        {#if onCancel}
          <button class="btn" type="button" onclick={onCancel}>{t("common.cancel")}</button>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: 20px;
    background: var(--gl-backdrop);
    animation: fade 0.15s;
  }
  .box {
    display: grid;
    justify-items: center;
    gap: 6px;
    width: 100%;
    max-width: 380px;
    padding: 24px 20px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
    color: var(--gl-ink);
    box-shadow: var(--gl-shadow);
    text-align: center;
  }
  .measured {
    justify-items: stretch;
    gap: 10px;
    text-align: left;
  }
  .meter {
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 4px;
  }
  .note {
    min-width: 0;
    overflow: hidden;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .spinner {
    width: 36px;
    height: 36px;
    margin-bottom: 8px;
    border-width: 3px;
  }
  h3 {
    margin: 0;
    font-family: var(--gl-font-display);
    font-weight: var(--gl-weight-title);
    font-size: var(--gl-size-name);
    letter-spacing: var(--gl-tracking-title);
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  @keyframes fade {
    from {
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .overlay,
    .meter i {
      animation: none;
      transition: none;
    }
  }
</style>
