<script lang="ts">
  import {
    captionLength,
    MAX_CAPTION_LENGTH,
    withinCaptionLimit,
  } from "../../../../player/caption";
  import { getTranslator } from "../../../i18n/context";

  /**
   * The card sheet's Title field, and its Subtitle field for the title slide (TITLE_SLIDES.md):
   * each is capped at the caption limit as typed, with a counter out of 80.
   */
  let {
    kind,
    title,
    subtitle,
    titleField = $bindable(),
    onTitleChange,
    onSubtitleChange,
  }: {
    kind: "opening" | "closing";
    title: string;
    subtitle: string | undefined;
    titleField: HTMLInputElement | undefined;
    onTitleChange: (title: string) => void;
    onSubtitleChange: (subtitle: string) => void;
  } = $props();

  const { t } = getTranslator();

  function titleInput(target: HTMLInputElement): void {
    const capped = withinCaptionLimit(target.value);
    if (capped !== target.value) {
      target.value = capped;
    }
    onTitleChange(capped);
  }

  function subtitleInput(target: HTMLInputElement): void {
    const capped = withinCaptionLimit(target.value);
    if (capped !== target.value) {
      target.value = capped;
    }
    onSubtitleChange(capped);
  }
</script>

<section class="field">
  <div class="row">
    <label class="eyebrow" for="card-title">{t("cards.titleLabel")}</label>
    <span class="count mono">
      {t("editor.captionCount", { count: captionLength(title), max: MAX_CAPTION_LENGTH })}
    </span>
  </div>
  <input
    bind:this={titleField}
    id="card-title"
    class="input"
    type="text"
    value={title}
    placeholder={kind === "closing" ? t("cards.titlePlaceholderClosing") : ""}
    autocomplete="off"
    oninput={(event) => titleInput(event.currentTarget)}
  />
</section>

{#if kind === "opening"}
  <section class="field">
    <div class="row">
      <label class="eyebrow" for="card-subtitle">{t("cards.subtitleLabel")}</label>
      <span class="count mono">
        {t("editor.captionCount", {
          count: captionLength(subtitle ?? ""),
          max: MAX_CAPTION_LENGTH,
        })}
      </span>
    </div>
    <input
      id="card-subtitle"
      class="input"
      type="text"
      value={subtitle ?? ""}
      autocomplete="off"
      oninput={(event) => subtitleInput(event.currentTarget)}
    />
  </section>
{/if}

<style>
  .field {
    display: grid;
    gap: 8px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .count {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .input {
    height: 38px;
    padding: 0 11px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
  }
  .input:focus {
    border-color: var(--gl-accent);
  }
</style>
