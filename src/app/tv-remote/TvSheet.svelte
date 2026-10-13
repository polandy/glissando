<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../components/Icon.svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import ExportDialog from "../screens/slideshow/export-sheet/ExportDialog.svelte";
  import TvCodeBoxes from "./TvCodeBoxes.svelte";
  import TvSlideshowCards from "./TvSlideshowCards.svelte";
  import { TV_CODE_LENGTH, isCompleteTvCode } from "./tv-code";
  import type { TvRequest, TvSession, TvSessionState } from "./tv-session";

  /**
   * "Show on TV" (tv_remote/IN_THE_APP.md): a dialog on desktop, a bottom sheet on a phone, from
   * the TV's code to the choice of slideshow.
   */
  let { session }: { session: TvSession } = $props();

  const { t } = getTranslator();

  // svelte-ignore state_referenced_locally
  let view = $state.raw<TvSessionState>(session.state);
  onMount(() => session.subscribe((next) => (view = next)));

  const FAILED_TEXT: Readonly<Record<TvRequest, MessageKey>> = {
    claim: "tvSheet.claimFailed",
    list: "tvSheet.listFailed",
    show: "tvSheet.showFailed",
  };

  const canConnect = $derived(isCompleteTvCode(view.code) && view.pending === null);

  function connect(): void {
    if (canConnect) void session.connect();
  }
</script>

<ExportDialog
  labelId="tv-sheet-title"
  title={t("tvSheet.title")}
  subtitle={null}
  closeLabel={t("common.close")}
  closeOnScrim={view.pending === null}
  onClose={() => session.close()}
>
  {#if view.step === "code"}
    <p class="lead">{t("tvSheet.codeBefore")}<b>{session.tvAddress}</b>{t("tvSheet.codeAfter")}</p>
    {#if view.tvClosed}
      <Notice tone="warn">{t("tvSheet.tvClosed", { address: session.tvAddress })}</Notice>
    {/if}
    <TvCodeBoxes
      code={view.code}
      disabled={view.pending !== null}
      onType={(code) => session.type(code)}
      onEnter={connect}
    />
  {:else if view.step === "noMatch"}
    <Notice tone="warn">
      <b>{t("tvSheet.noMatchStrong")}</b><br />{t("tvSheet.noMatchText")}
      {#snippet actions()}
        <button class="btn ghost" type="button" onclick={() => session.retypeCode()}>
          {t("tvSheet.typeAgain")}
        </button>
      {/snippet}
    </Notice>
  {:else if view.step === "pick"}
    <span class="pill"><i></i>{t("tvSheet.connected", { code: view.connectedCode ?? "" })}</span>
    <p class="lead">{t("tvSheet.which")}</p>
    {#if view.slideshows === undefined}
      {#if view.pending === "list"}<p class="hint">{t("tvSheet.loadingSlideshows")}</p>{/if}
    {:else if view.slideshows.length === 0}
      <p class="hint">{t("tvSheet.noSlideshows")}</p>
    {:else}
      <TvSlideshowCards
        slideshows={view.slideshows}
        selected={view.selected}
        onSelect={(slideshowId) => session.select(slideshowId)}
      />
    {/if}
  {/if}
  {#if view.unanswered !== null}
    <Notice tone="error">
      {t(FAILED_TEXT[view.unanswered])}
      {#snippet actions()}
        <button class="btn" type="button" onclick={() => void session.retry()}>
          {t("server.tryAgain")}
        </button>
      {/snippet}
    </Notice>
  {/if}
  {#if view.step === "code"}
    <footer class="split">
      <span class="count">
        {t("tvSheet.lettersTyped", { typed: view.code.length, count: TV_CODE_LENGTH })}
      </span>
      <button class="btn primary" type="button" disabled={!canConnect} onclick={connect}>
        {view.pending === "claim" ? t("tvSheet.connecting") : t("tvSheet.connect")}
      </button>
    </footer>
  {:else if view.step === "pick"}
    <footer class="split">
      <button class="btn danger" type="button" onclick={() => session.close()}>
        {t("tvSheet.disconnect")}
      </button>
      <button
        class="btn primary"
        type="button"
        disabled={view.selected === null || view.pending !== null}
        onclick={() => void session.show()}
      >
        <Icon name="tv" />{t("tvSheet.show")}
      </button>
    </footer>
  {/if}
</ExportDialog>

<style>
  .lead {
    margin: 0;
    color: var(--gl-muted);
    line-height: 1.4;
  }
  footer.split {
    justify-content: space-between;
    align-items: center;
  }
  .count {
    color: var(--gl-muted);
    font-size: var(--gl-size-label);
  }
  .pill {
    display: inline-flex;
    justify-self: start;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--gl-radius-pill);
    background: var(--gl-mint-tint);
    color: var(--gl-ink);
    font-size: var(--gl-size-small);
    font-weight: var(--gl-weight-semibold);
  }
  .pill i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--gl-mint);
  }
</style>
