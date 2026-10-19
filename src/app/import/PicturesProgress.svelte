<script lang="ts">
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import type { ImportPick, PictureImportState } from "../../import/picture-import";
  import type { IconName } from "../../ui-kit/icons";
  import { picturesPhase } from "./import-view";
  import type { CullingState } from "./picture-culling";
  import { pickName, queueRows } from "./picture-queue";

  /**
   * Step 1's own report: exactly one of the queue (a row per pick, with a stop button for each
   * still in flight), the culling check once the queue is empty, or what is in once both are
   * done. "Add pictures" lives in the strip instead (IMPORT_ARRANGING.md, `ImportPicturesStrip.svelte`).
   */
  let {
    state,
    checking,
    range,
    onStopPick,
  }: {
    state: PictureImportState;
    checking: CullingState["checking"];
    /** The capture dates of the stored pictures; null while none is stored. */
    range: { readonly from: string; readonly to: string } | null;
    /** Stops the named pick: its waiting files are dropped, what already landed stays. */
    onStopPick: (pickId: string) => void;
  } = $props();

  const { t, formatDate } = getTranslator();
  const importing = $derived(picturesPhase(state) === "importing");
  // Only read while importing or checking (below): done shows the picture count instead.
  const share = $derived.by(() => {
    if (importing) return state.total > 0 ? state.done / state.total : 0;
    return checking !== null && checking.total > 0 ? checking.checked / checking.total : 0;
  });
  const rows = $derived(queueRows(state.picks));

  const PICK_ICONS: Readonly<Record<ImportPick["kind"], IconName>> = {
    folder: "folder",
    files: "files",
    immich: "cloud",
  };
</script>

<div class="progress">
  {#if importing}
    <div class="queue">
      <div class="queue-head">
        <span>{t("import.queueHeader", { done: state.done, count: state.total })}</span>
        <span class="mono muted">
          {t("import.queueLeft", { count: state.total - state.done })}
        </span>
      </div>
      {#if rows.earlierDone > 0}
        <p class="muted earlier">{t("import.earlierPicksDone", { count: rows.earlierDone })}</p>
      {/if}
      <ul class="queue-rows">
        {#each rows.rows as row (row.pick.id)}
          <li class="queue-row">
            <Icon name={PICK_ICONS[row.pick.kind]} />
            <span class="name">{pickName(row.pick, t)}</span>
            <span class="status mono">
              {#if row.finished}
                {t("import.pickDone", { count: row.pick.done })}
              {:else if row.inFlight}
                {t("import.pickProgress", { done: row.pick.done, total: row.pick.total })}
              {:else}
                {t("import.pickWaiting")}
              {/if}
            </span>
            {#if !row.finished}
              <button
                class="stop"
                type="button"
                aria-label={t("import.stopPick", { name: pickName(row.pick, t) })}
                onclick={() => onStopPick(row.pick.id)}
              >
                <Icon name="close" />
              </button>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {:else if checking !== null}
    <div class="progress-row">
      <span>
        <span class="mono">
          {t("import.progressCount", { done: checking.checked, count: checking.total })}
        </span>
        {t("cull.checkingLabel")}
      </span>
    </div>
  {:else if range !== null}
    <div class="progress-row">
      <span>
        <b>{t("units.pictures", { count: state.pictures.length })}</b>
        <span class="muted">
          · {t("import.dateRange", { from: formatDate(range.from), to: formatDate(range.to) })}
        </span>
      </span>
    </div>
  {/if}
  {#if importing || checking !== null}
    <div class="meter">
      <i style:width="{share * 100}%"></i>
    </div>
  {/if}
</div>

<style>
  .progress {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid var(--gl-line);
    border-radius: var(--gl-radius-large);
    background: var(--gl-surface);
  }
  .progress-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .queue {
    display: grid;
    gap: 6px;
  }
  .queue-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .earlier {
    margin: 0;
    font-size: var(--gl-size-small);
  }
  .queue-rows {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .queue-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }
  .queue-row .name {
    overflow: hidden;
    flex: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .queue-row .status {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
  .queue-row .stop {
    display: grid;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: var(--gl-radius-pill);
    background: transparent;
    color: var(--gl-muted);
    cursor: pointer;
  }
  .queue-row .stop:hover {
    background: var(--gl-hover);
    color: var(--gl-ink);
  }
  .meter {
    height: 6px;
    overflow: hidden;
    border-radius: 3px;
    background: var(--gl-hover);
  }
  .meter i {
    display: block;
    height: 100%;
    border-radius: 3px;
    background: var(--gl-mint);
    transition: width 0.3s;
  }
  @media (prefers-reduced-motion: reduce) {
    .meter i {
      transition: none;
    }
  }
</style>
