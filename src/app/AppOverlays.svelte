<script lang="ts">
  import { installOffer, type InstallOffer, type PwaState } from "../pwa/status-bar-view";
  import type { OpenFlowState } from "./glissando-file/open-flow";
  import OpeningOverlay from "./glissando-file/OpeningOverlay.svelte";
  import Toast from "./components/Toast.svelte";
  import PwaSheet, { type PwaSheetContent } from "./pwa/PwaSheet.svelte";
  import PersistRefusedDialog from "./storage/PersistRefusedDialog.svelte";
  import type { ToastMessage } from "./toast/toaster";
  import TvControl from "./tv-remote/TvControl.svelte";
  import type { TvSession } from "./tv-remote/tv-session";

  let {
    openState,
    toast,
    persistRefused,
    pwaSheet,
    pwaState,
    onCancelOpen,
    onToastAction,
    onDismissToast,
    onPersistUnderstood,
    onInstall,
    onClosePwaSheet,
    tvAtStart,
  }: {
    openState: OpenFlowState;
    toast: ToastMessage | null;
    persistRefused: boolean;
    pwaSheet: PwaSheetContent | null;
    pwaState: PwaState;
    onCancelOpen: () => void;
    onToastAction: () => void;
    onDismissToast: () => void;
    onPersistUnderstood: () => void;
    onInstall: (offer: InstallOffer) => void;
    onClosePwaSheet: () => void;
    /** "Show on TV", opened by the TV's QR code over the start screen (tv_remote/IN_THE_APP.md). */
    tvAtStart: TvSession | null;
  } = $props();
</script>

{#if openState.opening !== null}
  <OpeningOverlay opening={openState.opening} onCancel={onCancelOpen} />
{/if}

{#if tvAtStart !== null}
  <TvControl session={tvAtStart} withRow={false} />
{/if}

{#if toast !== null}
  <Toast {toast} onAction={onToastAction} onDismiss={onDismissToast} />
{/if}

{#if persistRefused}
  <PersistRefusedDialog
    offer={installOffer(pwaState)}
    onUnderstood={onPersistUnderstood}
    {onInstall}
  />
{/if}

{#if pwaSheet !== null}
  <PwaSheet sheet={pwaSheet} onClose={onClosePwaSheet} />
{/if}
