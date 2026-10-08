<script lang="ts" module>
  import type { InstallGuide } from "../../pwa/install-guide";

  export type PwaSheetContent =
    | { readonly kind: "why"; readonly address: string }
    | { readonly kind: "guide"; readonly guide: InstallGuide };
</script>

<script lang="ts">
  import Dialog from "../components/Dialog.svelte";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import { INSTALL_STEPS, type InstallStep } from "./install-steps";

  let { sheet, onClose }: { sheet: PwaSheetContent; onClose: () => void } = $props();

  const { t } = getTranslator();
  // A private-use character no copy contains: marks where a step's key goes.
  const KEY_SLOT = "\u{E000}";

  function around(step: InstallStep): readonly [string, string] {
    const [before = "", after = ""] = t(step.text, { key: KEY_SLOT }).split(KEY_SLOT);
    return [before, after];
  }

  const close = $derived([
    { label: t("common.understood"), tone: "primary" as const, onSelect: onClose },
  ]);
</script>

{#if sheet.kind === "why"}
  <Dialog
    title={t("pwa.whyTitle")}
    message={[
      t("pwa.whyInsecure", { address: sheet.address }),
      t("pwa.whyStored"),
      t("pwa.whyRemedy"),
    ]}
    actions={close}
    onCancel={onClose}
  />
{:else}
  {@const guide = INSTALL_STEPS[sheet.guide]}
  <Dialog
    title={t(guide.title)}
    message={guide.after.map((key) => t(key))}
    actions={close}
    onCancel={onClose}
  >
    {#if guide.steps.length > 0}
      <ol class="steps">
        {#each guide.steps as step (step.text)}
          {@const [before, after] = around(step)}
          <li>
            <span
              >{before}<span class="key"
                >{#if step.key.icon !== undefined}<Icon name={step.key.icon} />{/if}{t(
                  step.key.label,
                )}</span
              >{after}</span
            >
          </li>
        {/each}
      </ol>
    {/if}
  </Dialog>
{/if}

<style>
  .steps {
    display: grid;
    gap: 10px;
    margin: 4px 0 12px;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  .steps li {
    display: grid;
    grid-template-columns: 28px 1fr;
    align-items: center;
    gap: 10px;
    counter-increment: step;
  }
  .steps li::before {
    content: counter(step);
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--gl-hover);
    font-family: var(--gl-font-mono);
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-label);
  }
  .key {
    --gl-icon-size: var(--gl-size-icon-small);
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-small);
    background: var(--gl-raised);
    color: var(--gl-ink);
    font-weight: var(--gl-weight-semibold);
    white-space: nowrap;
  }
</style>
