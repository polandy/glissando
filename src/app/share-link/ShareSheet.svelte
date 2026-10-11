<script lang="ts" module>
  /** What the sheet's summary line names of the slideshow. */
  export interface ShareSubject {
    readonly title: string;
    readonly pictureCount: number;
    readonly durationSeconds: number;
    readonly hasMusic: boolean;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import Icon from "../components/Icon.svelte";
  import Notice from "../components/Notice.svelte";
  import { getTranslator } from "../i18n/context";
  import type { MessageKey } from "../i18n/messages";
  import ExportDialog from "../screens/slideshow/export-sheet/ExportDialog.svelte";
  import NotSharedBody from "./NotSharedBody.svelte";
  import SharedLinkBody from "./SharedLinkBody.svelte";
  import type { ShareLinkRequest, ShareLinkSession, ShareLinkState } from "./share-link-session";

  /**
   * "Share by link" (SHARE_LINK.md, In the app): a dialog on desktop, a bottom sheet on a phone,
   * from not shared through shared to "Turn off the link?".
   */
  let {
    session,
    subject,
  }: {
    session: ShareLinkSession;
    subject: ShareSubject;
  } = $props();

  const { t, formatDuration } = getTranslator();

  // svelte-ignore state_referenced_locally
  let view = $state.raw<ShareLinkState>(session.state);
  onMount(() => session.subscribe((next) => (view = next)));

  const FAILED_TEXT: Readonly<Record<ShareLinkRequest, MessageKey>> = {
    load: "share.loadFailed",
    create: "share.createFailed",
    turnOff: "share.turnOffFailed",
  };

  const confirming = $derived(view.sheet === "confirmTurnOff");
  const summary = $derived(
    t("share.summary", {
      title: subject.title,
      pictures: t("units.pictures", { count: subject.pictureCount }),
      duration: formatDuration(subject.durationSeconds),
      music: subject.hasMusic ? t("htmlExport.withMusic") : t("htmlExport.withoutMusic"),
    }),
  );
</script>

<ExportDialog
  labelId="share-sheet-title"
  title={confirming ? t("share.confirmTitle") : t("share.title")}
  subtitle={confirming ? null : summary}
  closeLabel={t("common.close")}
  closeOnScrim={view.pending === null}
  onClose={() => session.close()}
>
  {#if confirming}
    <p class="confirm">{t("share.confirmText", { title: subject.title })}</p>
  {:else if view.link === undefined}
    {#if view.pending !== null}<p class="hint">{t("share.loading")}</p>{/if}
  {:else if view.link === null}
    <NotSharedBody />
  {:else}
    <SharedLinkBody
      {session}
      link={view.link}
      copied={view.copied}
      qrCodeShown={view.qrCodeShown}
      title={subject.title}
    />
  {/if}
  {#if !confirming && session.atHomeNetworkAddress}
    <Notice tone="warn">
      <b>{t("share.homeNetworkStrong")}</b>{t("share.homeNetworkAfter")}
    </Notice>
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
  {#if confirming}
    <footer>
      <button class="btn ghost" type="button" onclick={() => session.cancelTurnOff()}>
        {t("common.cancel")}
      </button>
      <button
        class="btn danger"
        type="button"
        disabled={view.pending !== null}
        onclick={() => void session.turnOff()}
      >
        {t("share.turnOff")}
      </button>
    </footer>
  {:else if view.link === null}
    <footer>
      <button class="btn ghost" type="button" onclick={() => session.close()}>
        {t("common.cancel")}
      </button>
      <button
        class="btn primary"
        type="button"
        disabled={view.pending !== null}
        onclick={() => void session.create()}
      >
        <Icon name="link" />{t("share.create")}
      </button>
    </footer>
  {:else if view.link !== undefined}
    <footer class="split">
      <button class="btn danger-text" type="button" onclick={() => session.askTurnOff()}>
        <Icon name="unlink" />{t("share.turnOff")}
      </button>
      <button class="btn primary" type="button" onclick={() => session.close()}>
        {t("share.done")}
      </button>
    </footer>
  {/if}
</ExportDialog>

<style>
  .confirm {
    margin: 0;
    line-height: 1.5;
  }
  footer.split {
    justify-content: space-between;
  }
  .danger-text {
    border-color: transparent;
    background: transparent;
    color: var(--gl-danger-text);
  }
  .danger-text:hover {
    background: color-mix(in srgb, var(--gl-coral) 14%, var(--gl-surface));
  }
</style>
