<script lang="ts">
  import { isGradedLook, lookFilterValues, SLIDESHOW_LOOKS } from "../../../player";
  import { lookFilterId } from "./look-filter-id";

  /** Hidden SVG `<filter>` defs for every graded look, scoped by `prefix` so several instances
   * (the strip, an open sheet) can coexist in one document without id collisions. */
  let { prefix }: { prefix: string } = $props();

  const gradedLooks = SLIDESHOW_LOOKS.filter(isGradedLook);
</script>

<svg aria-hidden="true" focusable="false" class="defs">
  <defs>
    {#each gradedLooks as look (look)}
      {@const values = lookFilterValues(look)}
      {#if values !== null}
        <filter id={lookFilterId(prefix, look)} color-interpolation-filters="sRGB">
          <feColorMatrix type="matrix" values={values.colorMatrixValues} />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={values.tableValues.r} />
            <feFuncG type="table" tableValues={values.tableValues.g} />
            <feFuncB type="table" tableValues={values.tableValues.b} />
          </feComponentTransfer>
        </filter>
      {/if}
    {/each}
  </defs>
</svg>

<style>
  .defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
  }
</style>
