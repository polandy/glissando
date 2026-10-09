<script lang="ts">
  import type { InstallOffer } from "../../pwa/status-bar-view";
  import Dialog from "../components/Dialog.svelte";
  import { getTranslator } from "../i18n/context";

  let {
    offer,
    onUnderstood,
    onInstall,
  }: {
    /** Null where this browser cannot install the app. */
    offer: InstallOffer | null;
    onUnderstood: () => void;
    onInstall: (offer: InstallOffer) => void;
  } = $props();

  const { t } = getTranslator();
  const understood = $derived({ label: t("common.understood"), onSelect: onUnderstood });
</script>

<!-- Installing is the remedy wherever it is possible (dev-docs/APP.md). -->
{#if offer === null}
  <Dialog
    title={t("storage.persistRefusedTitle")}
    message={t("storage.persistRefusedText")}
    actions={[{ ...understood, tone: "primary" }]}
  />
{:else}
  <Dialog
    title={t("storage.persistRefusedTitle")}
    message={[t("storage.persistRefusedText"), t("pwa.installedKeepsMore")]}
    actions={[
      { ...understood, tone: "ghost" },
      {
        label: t("pwa.installAsApp"),
        tone: "primary",
        icon: "install",
        onSelect: () => {
          onUnderstood();
          onInstall(offer);
        },
      },
    ]}
  />
{/if}
