<script lang="ts">
  import type { ImmichPerson } from "../../immich/immich-client";
  import { getTranslator } from "../i18n/context";
  import BrowseFailed from "./BrowseFailed.svelte";
  import BrowseState from "./BrowseState.svelte";
  import FilterField from "./FilterField.svelte";
  import { filterByName } from "./immich-view";
  import type { ToolListState } from "./tool-list";

  /** People as round face crops with their names; a tap opens the person's pictures. */
  let {
    people,
    faceUrl,
    onOpen,
    onRetry,
    onReload,
  }: {
    people: ToolListState<ImmichPerson>;
    faceUrl: (personId: string) => string;
    onOpen: (person: ImmichPerson) => void;
    onRetry: () => void;
    onReload: () => void;
  } = $props();

  const SHIMMER_FACES = 10;
  const { t } = getTranslator();
  let filter = $state("");
  const shown = $derived(people.items === null ? null : filterByName(people.items, filter));
</script>

<div class="head"><FilterField bind:value={filter} label={t("immich.filterPeople")} /></div>
{#if people.failure !== null}
  <BrowseFailed failure={people.failure} {onRetry} {onReload} />
{:else if shown !== null && people.items?.length === 0}
  <BrowseState icon="image" title={t("immich.noPeople")} text={t("immich.noPeopleText")} />
{:else if shown !== null && shown.length === 0}
  <BrowseState
    icon="search"
    title={t("immich.noPersonMatches")}
    text={t("immich.noPersonMatchesText", { filter: filter.trim() })}
  />
{:else}
  <ul class="people">
    {#if shown === null}
      {#each { length: SHIMMER_FACES }, index (index)}
        <li class="person" aria-hidden="true"><span class="face pending"></span></li>
      {/each}
    {:else}
      {#each shown as person (person.id)}
        <li>
          <button class="person" type="button" onclick={() => onOpen(person)}>
            <span class="face">
              <img src={faceUrl(person.id)} alt="" loading="lazy" decoding="async" />
            </span>
            <span class="name">{person.name}</span>
          </button>
        </li>
      {/each}
    {/if}
  </ul>
{/if}

<style>
  .people {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .person {
    display: grid;
    justify-items: center;
    gap: 8px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .face {
    position: relative;
    display: block;
    width: 88px;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 50%;
    background: var(--gl-hover);
  }
  .face img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .name {
    font-weight: var(--gl-weight-semibold);
    text-align: center;
    overflow-wrap: anywhere;
  }
  .pending::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, var(--gl-scrim) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite linear;
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .pending::after {
      animation: none;
    }
  }
</style>
