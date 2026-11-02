<script lang="ts">
  import { MAX_TITLE_LENGTH } from "../../library/slideshow-edits";
  import { getTranslator } from "../i18n/context";

  /** The new slideshow's title; focused with its text selected, so typing replaces it. */
  let {
    value = $bindable(),
    onEnter,
  }: {
    value: string;
    /** The user pressed Enter in the field. */
    onEnter: () => void;
  } = $props();

  const { t } = getTranslator();

  function focusSelected(input: HTMLInputElement): void {
    input.focus();
    input.select();
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter();
    }
  }
</script>

<label class="field">
  {t("import.titleLabel")}
  <input
    bind:value
    maxlength={MAX_TITLE_LENGTH}
    enterkeyhint="done"
    autocomplete="off"
    use:focusSelected
    onkeydown={keydown}
  />
  <small>{t("import.titleHint")}</small>
</label>

<style>
  .field {
    display: grid;
    flex: 1 0 100%;
    gap: 6px;
    font-size: var(--gl-size-label);
    font-weight: var(--gl-weight-semibold);
  }
  input {
    min-height: var(--gl-hit-min);
    padding: 0 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-tile);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font: inherit;
    font-size: var(--gl-size-title);
    font-weight: var(--gl-weight-medium);
  }
  input:focus-visible {
    outline: 2px solid var(--gl-accent);
    outline-offset: 0;
    border-color: transparent;
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-regular);
  }
</style>
