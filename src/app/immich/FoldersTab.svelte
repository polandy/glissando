<script lang="ts">
  import type { Snippet } from "svelte";
  import { folderCrumbs, rootFolders, subfolders } from "../../immich/folder-tree";
  import Icon from "../components/Icon.svelte";
  import { getTranslator } from "../i18n/context";
  import BrowseFailed from "./BrowseFailed.svelte";
  import BrowseState from "./BrowseState.svelte";
  import type { ToolListState } from "./tool-list";

  /** Folders: a path crumb, the subfolders as rows, then the folder's own pictures. */
  let {
    folders,
    folderPath,
    onOpenFolder,
    onRetry,
    onReload,
    pictures,
  }: {
    folders: ToolListState<string>;
    /** The folder shown; null at the top. */
    folderPath: string | null;
    onOpenFolder: (path: string | null) => void;
    onRetry: () => void;
    onReload: () => void;
    /** The pictures directly in the folder, below the rows. */
    pictures: Snippet<[string]>;
  } = $props();

  const { t } = getTranslator();
  const crumbs = $derived(folderCrumbs(folderPath));
  const rows = $derived(
    folders.items === null
      ? []
      : folderPath === null
        ? rootFolders(folders.items)
        : subfolders(folders.items, folderPath),
  );
</script>

{#if folders.failure !== null}
  <BrowseFailed failure={folders.failure} {onRetry} {onReload} />
{:else if folders.items === null}
  <BrowseState icon="folder" title={t("immich.loadingFolders")} />
{:else}
  <nav class="path" aria-label={t("immich.folderPath")}>
    {#if folderPath === null}
      <b>{t("immich.folderRoot")}</b>
    {:else}
      <button type="button" onclick={() => onOpenFolder(null)}>{t("immich.folderRoot")}</button>
      {#each crumbs as crumb, index (crumb.path)}
        <span class="slash" aria-hidden="true">/</span>
        {#if index < crumbs.length - 1}
          <button type="button" onclick={() => onOpenFolder(crumb.path)}>{crumb.name}</button>
        {:else}
          <b aria-current="location">{crumb.name}</b>
        {/if}
      {/each}
    {/if}
  </nav>
  {#if rows.length > 0}
    <ul class="rows">
      {#each rows as row (row.path)}
        <li>
          <button class="row" type="button" onclick={() => onOpenFolder(row.path)}>
            <Icon name="folder" />
            <span class="name">{row.name}</span>
            {#if row.subfolderCount > 0}
              <span class="mono count">
                {t("immich.folderCount", { count: row.subfolderCount })}
              </span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {:else if folderPath === null}
    <BrowseState icon="folder" title={t("immich.noFolders")} text={t("immich.noFoldersText")} />
  {/if}
  {#if folderPath !== null}{@render pictures(folderPath)}{/if}
{/if}

<style>
  .path {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: var(--gl-size-label);
  }
  .path button {
    padding: 2px 4px;
    border: 0;
    background: transparent;
    color: var(--gl-muted);
    text-decoration: underline;
    font: inherit;
    cursor: pointer;
  }
  .slash {
    color: var(--gl-faint);
  }
  .rows {
    display: grid;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .row {
    --gl-icon-size: var(--gl-size-icon-small);
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: 0;
    border-radius: var(--gl-radius);
    background: var(--gl-surface);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row:hover {
    background: var(--gl-hover);
  }
  .name {
    flex: 1;
  }
  .count {
    color: var(--gl-muted);
    font-size: var(--gl-size-small);
  }
</style>
