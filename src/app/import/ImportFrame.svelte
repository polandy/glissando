<script lang="ts">
  import type { Snippet } from "svelte";
  import Header from "../components/Header.svelte";
  import { getTranslator } from "../i18n/context";
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
</script>

<div class="screen">
  <Header crumbs={[t("app.name"), t("import.crumb"), stepCrumb]} {onBack} />
  <div class="steps" aria-hidden="true">
    {#each IMPORT_STEPS as known, index (known)}
      <i class:on={index <= stepIndex}></i>
    {/each}
  </div>
  <main>{@render children()}</main>
  <div class="actions">{@render actions()}</div>
</div>

<style>
  .steps {
    display: flex;
    gap: 6px;
    margin: 4px 16px 14px;
  }
  .steps i {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--gl-line);
  }
  .steps i.on {
    background: var(--gl-mint);
  }
  main {
    flex: 1;
    padding: 0 16px 24px;
  }
  main :global(h1) {
    margin: 8px 0 6px;
    font-weight: var(--gl-weight-heading);
    font-size: var(--gl-size-heading);
    line-height: 1.1;
  }
  main > :global(p.muted) {
    margin: 6px 0 14px;
    line-height: 1.4;
  }
  .actions {
    position: sticky;
    bottom: 0;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: linear-gradient(transparent, var(--gl-bg) 30%);
  }
  .actions :global(.btn.primary) {
    flex: 1;
    justify-content: center;
  }
  @container (min-width: 700px) {
    .actions :global(.btn.primary) {
      flex: 0 1 auto;
      min-width: 240px;
    }
  }
</style>
