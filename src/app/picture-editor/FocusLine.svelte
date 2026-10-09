<script lang="ts">
  import { getTranslator } from "../i18n/context";
  import type { FocusIndication } from "./focus-indication";

  /** One quiet line under the picture: no subject found, or the focus still being searched for. */
  let { indication }: { indication: FocusIndication } = $props();

  const { t } = getTranslator();
</script>

<p
  class="focus-line"
  class:empty={indication.kind !== "no-subject" && indication.kind !== "searching"}
>
  {#if indication.kind === "no-subject"}
    {t("editor.noSubject")}
  {:else if indication.kind === "searching"}
    <span class="searching" role="status"><i class="dot"></i>{t("editor.searchingFocus")}</span>
  {/if}
</p>

<style>
  .focus-line {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 18px;
    margin: 0;
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
    line-height: 1.45;
    text-align: center;
  }
  .searching {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 3px 10px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-hover);
    font-weight: var(--gl-weight-medium);
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gl-mint);
    animation: pulse 1.6s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      opacity: 0.3;
    }
  }
  @container (max-width: 720px) {
    .focus-line {
      padding: 0 16px;
    }
    .focus-line.empty {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .dot {
      animation: none;
    }
  }
</style>
