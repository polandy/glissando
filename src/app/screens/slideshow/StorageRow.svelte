<script lang="ts">
  import Icon from "../../components/Icon.svelte";
  import { getTranslator } from "../../i18n/context";
  import type { SlideshowStorage } from "../view-models";

  /** The info panel's row under "Play": where the slideshow lives and, on the server, saving. */
  let { storage }: { storage: SlideshowStorage } = $props();

  const { t } = getTranslator();

  const origin = $derived.by(() => {
    if (storage.kind === "server") return t("server.storageServerText");
    const { fromImmich, fromDevice } = storage;
    if (fromDevice === 0) return t("server.storageAllImmich", { count: fromImmich });
    if (fromImmich === 0) return t("server.storageAllDevice", { count: fromDevice });
    return t("server.storageMixed", { immich: fromImmich, device: fromDevice });
  });
</script>

<div class="storage">
  <Icon name={storage.kind === "server" ? "server" : "device"} />
  <span class="text">
    <strong>
      {storage.kind === "server" ? t("server.sectionServer") : t("server.sectionDevice")}
    </strong>
    <small>{origin}</small>
  </span>
  {#if storage.kind === "server"}
    <span class="status" role="status">
      {#if storage.saving}
        {t("server.savingEdit")}
      {:else}
        <span class="dot" aria-hidden="true"></span>{t("server.saved")}
      {/if}
    </span>
  {/if}
</div>

<style>
  .storage {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius);
  }
  .text {
    display: grid;
    flex: 1;
    gap: 2px;
    min-width: 0;
    font-size: var(--gl-size-meta);
  }
  small {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
    white-space: nowrap;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint);
  }
</style>
