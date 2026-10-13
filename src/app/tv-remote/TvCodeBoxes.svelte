<script lang="ts">
  import { onMount, tick } from "svelte";
  import { getTranslator } from "../i18n/context";
  import { TV_CODE_LENGTH } from "./tv-code";

  /**
   * The TV's code as four single-letter boxes (tv_remote/IN_THE_APP.md). Whatever lands in a box,
   * a letter or a pasted code, replaces the code from that box on; the session keeps it normalised.
   */
  let {
    code,
    disabled,
    onType,
    onEnter,
  }: {
    code: string;
    disabled: boolean;
    onType: (code: string) => void;
    onEnter: () => void;
  } = $props();

  const { t } = getTranslator();
  const INDICES = Array.from({ length: TV_CODE_LENGTH }, (_, index) => index);
  const LAST_BOX = TV_CODE_LENGTH - 1;
  const boxes: HTMLInputElement[] = [];

  // After the sheet's dialog opened, which focuses its first button.
  onMount(() => void tick().then(focusNext));

  /** The box the next letter goes into. */
  function focusNext(): void {
    const box = boxes[Math.min(code.length, LAST_BOX)];
    box?.focus();
    box?.select();
  }

  async function typed(index: number, value: string): Promise<void> {
    onType(code.slice(0, index) + value + code.slice(index + 1));
    await tick();
    // A refused letter leaves the code as it was, so the box shows the code again, not the letter.
    boxes.forEach((box, at) => (box.value = code[at] ?? ""));
    focusNext();
  }

  function keydown(index: number, event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      onEnter();
    } else if (event.key === "Backspace" && code[index] === undefined && index > 0) {
      event.preventDefault();
      void typed(index - 1, "");
    }
  }
</script>

<div class="code" role="group" aria-label={t("tvSheet.codeLabel")}>
  {#each INDICES as index (index)}
    <input
      bind:this={boxes[index]}
      value={code[index] ?? ""}
      {disabled}
      aria-label={t("tvSheet.letter", { number: index + 1, count: TV_CODE_LENGTH })}
      autocomplete="off"
      autocapitalize="characters"
      spellcheck="false"
      enterkeyhint="go"
      placeholder="·"
      oninput={(event) => void typed(index, event.currentTarget.value)}
      onkeydown={(event) => keydown(index, event)}
      onfocus={(event) => event.currentTarget.select()}
    />
  {/each}
</div>

<style>
  .code {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
  input {
    width: 52px;
    height: 64px;
    border: 2px solid var(--gl-line);
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: var(--gl-ink);
    font-family: var(--gl-font-mono);
    font-size: var(--gl-size-heading);
    font-weight: var(--gl-weight-medium);
    text-align: center;
    text-transform: uppercase;
  }
  input:focus-visible {
    border-color: var(--gl-accent);
    outline: none;
  }
  input::placeholder {
    color: var(--gl-faint);
  }
</style>
