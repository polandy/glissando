<script lang="ts">
  import type { Snippet } from "svelte";
  import Header from "../components/Header.svelte";
  import Icon from "../components/Icon.svelte";
  import { keepToastsClear } from "../components/toast-clearance";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import { IMPORT_STEPS, type ImportStep } from "../navigation/route";

  /** The wizard's frame: crumbs with the step, the step bar, the body and the bottom actions. */
  let {
    step,
    onBack,
    children,
    actions,
  }: { step: ImportStep; onBack: () => void; children: Snippet; actions: Snippet } = $props();

  const { t } = getTranslator();
  const stepCrumb = $derived(
    step === "pictures" ? t("import.crumbPictures") : t("import.crumbMusic"),
  );
  const stepIndex = $derived(IMPORT_STEPS.indexOf(step));
  const STEP_LABELS: Readonly<Record<ImportStep, MessageKey>> = {
    pictures: "import.crumbPictures",
    music: "import.crumbMusic",
  };
</script>

<div class="screen">
  <Header crumbs={[t("start.library"), t("import.crumb"), stepCrumb]} {onBack} />
  <main class="content">
    <!-- The crumbs name the step for assistive technology; this bar repeats it visually. -->
    <ol class="steps" aria-hidden="true">
      {#each IMPORT_STEPS as known, index (known)}
        {#if index > 0}<li class="line"></li>{/if}
        <li class="step" class:on={index === stepIndex} class:done={index < stepIndex}>
          <span class="num mono">
            {#if index < stepIndex}<Icon name="check" />{:else}{index + 1}{/if}
          </span>
          {t(STEP_LABELS[known])}
        </li>
      {/each}
    </ol>
    {@render children()}
  </main>
  <div class="actions" use:keepToastsClear>{@render actions()}</div>
</div>

<style>
  .steps {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-weight: var(--gl-weight-semibold);
    font-size: var(--gl-size-label);
  }
  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--gl-muted);
  }
  .num {
    --gl-icon-size: var(--gl-size-icon-small);
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border: 1.5px solid var(--gl-line);
    border-radius: 50%;
    font-weight: var(--gl-weight-medium);
    font-size: var(--gl-size-caption);
  }
  .step.on {
    color: var(--gl-ink);
  }
  .step.on .num {
    border-color: var(--gl-ink);
    background: var(--gl-ink);
    color: var(--gl-surface);
  }
  .step.done .num {
    border-color: var(--gl-mint);
    background: var(--gl-mint);
    color: var(--gl-mint-ink);
  }
  .line {
    width: 28px;
    height: 1.5px;
    background: var(--gl-line);
  }
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--gl-line);
    background: var(--gl-surface);
  }
  @container (max-width: 720px) {
    .actions {
      padding-inline: 16px;
    }
    .actions :global(.btn.primary) {
      flex: 1;
    }
  }
</style>
