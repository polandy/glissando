<script lang="ts">
  import { captionLength, MAX_CAPTION_LENGTH, normalizeCaption } from "../../player";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";

  /**
   * The picture's caption, one line: every keystroke goes to `onInput` and is stored at once;
   * leaving the field tidies the text to what is stored. Enter leaves it.
   */
  let {
    pictureId,
    value = $bindable(),
    onInput,
  }: {
    pictureId: string;
    /** As typed; the stored caption is its normalised form. */
    value: string;
    onInput: (typed: string) => void;
  } = $props();

  const { t } = getTranslator();
  const fieldId = $derived(`caption-${pictureId}`);
  let field = $state<HTMLInputElement>();

  function typed(text: string): void {
    value = text;
    onInput(text);
  }

  function clear(): void {
    typed("");
    field?.focus();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      field?.blur();
    }
  }
</script>

<section class="caption" aria-label={t("editor.caption")}>
  <div class="row">
    <label class="eyebrow" for={fieldId}>{t("editor.caption")}</label>
    <span class="count mono">
      {t("editor.captionCount", { count: captionLength(value), max: MAX_CAPTION_LENGTH })}
    </span>
  </div>
  <div class="field-wrap">
    <input
      bind:this={field}
      id={fieldId}
      class="field"
      type="text"
      {value}
      maxlength={MAX_CAPTION_LENGTH}
      enterkeyhint="done"
      autocomplete="off"
      placeholder={t("editor.captionPlaceholder")}
      oninput={(event) => typed(event.currentTarget.value)}
      onkeydown={keydown}
      onblur={() => (value = normalizeCaption(value) ?? "")}
    />
    {#if value !== ""}
      <button
        class="icon-btn clear"
        type="button"
        aria-label={t("editor.captionClear")}
        title={t("editor.captionClear")}
        onclick={clear}
      >
        <Icon name="close" />
      </button>
    {/if}
  </div>
  <p class="hint muted">{t("editor.captionHint")}</p>
</section>

<style>
  .caption {
    display: grid;
    gap: 10px;
    padding-top: 18px;
    border-top: 1px solid var(--gl-line);
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
  .field-wrap {
    position: relative;
  }
  .field {
    width: 100%;
    height: 38px;
    padding: 0 40px 0 11px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
    outline: none;
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-body);
  }
  .field:focus {
    border-color: var(--gl-accent);
  }
  .clear {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 32px;
    height: 32px;
    color: var(--gl-muted);
  }
  .hint {
    margin: 0;
    font-size: var(--gl-size-small);
  }
</style>
