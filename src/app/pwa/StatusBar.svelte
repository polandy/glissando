<script lang="ts">
  import type { StatusBarAction, StatusBarView } from "../../pwa/status-bar-view";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";

  let {
    view,
    onAction,
    onDismissHint,
  }: {
    view: StatusBarView;
    onAction: (action: StatusBarAction) => void;
    onDismissHint: () => void;
  } = $props();

  const { t } = getTranslator();

  const STATUS_TEXT: Readonly<
    Record<StatusBarView["status"], { readonly wide: MessageKey; readonly narrow: MessageKey }>
  > = {
    insecure: { wide: "pwa.status.insecure", narrow: "pwa.status.insecureNarrow" },
    storageRefused: {
      wide: "pwa.status.storageRefused",
      narrow: "pwa.status.storageRefusedNarrow",
    },
    installed: { wide: "pwa.status.installed", narrow: "pwa.status.installedNarrow" },
    offline: { wide: "pwa.status.offline", narrow: "pwa.status.offlineNarrow" },
  };
  const WARNING_STATUSES: ReadonlySet<StatusBarView["status"]> = new Set([
    "insecure",
    "storageRefused",
  ]);

  const text = $derived(STATUS_TEXT[view.status]);
  const action = $derived(view.action);
</script>

<footer class="status">
  <span class="text">
    <span class="dot" class:warning={WARNING_STATUSES.has(view.status)}></span>
    <span class="wide">{t(text.wide)}</span>
    <span class="narrow">{t(text.narrow)}</span>
  </span>
  {#if action.kind === "reload"}
    <button class="btn small" type="button" onclick={() => onAction(action)}>
      <Icon name="refresh" />{t("pwa.reload")}
    </button>
  {:else if action.kind === "why"}
    <button class="btn ghost small" type="button" onclick={() => onAction(action)}>
      <Icon name="info" />{t("pwa.why")}
    </button>
  {:else if action.kind === "installPrompt" || action.kind === "installGuide"}
    <span class="hint">
      <button class="btn small" type="button" onclick={() => onAction(action)}>
        <Icon name="install" />{t(
          action.kind === "installPrompt" ? "pwa.installApp" : "pwa.installAsApp",
        )}
      </button>
      {#if action.dismissible}
        <button
          class="icon-btn small"
          type="button"
          aria-label={t("pwa.hideHint")}
          onclick={onDismissHint}
        >
          <Icon name="close" />
        </button>
      {/if}
    </span>
  {/if}
</footer>

<style>
  .status {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    min-height: 46px;
    padding: 6px 10px 6px 24px;
    border-top: 1px solid var(--gl-line);
    background: var(--gl-surface);
    color: var(--gl-muted);
    font-size: var(--gl-size-meta);
  }
  .text {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot {
    flex: none;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
  .dot.warning {
    background: var(--gl-lemon);
  }
  .narrow {
    display: none;
  }
  .hint {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .btn.small:not(.ghost) {
    color: var(--gl-ink);
  }
  .btn.small:not(.ghost) :global(.icon) {
    color: var(--gl-accent);
  }
  @container (max-width: 720px) {
    .status {
      padding: 6px 6px 6px 16px;
    }
    .wide {
      display: none;
    }
    .narrow {
      display: inline;
    }
  }
</style>
