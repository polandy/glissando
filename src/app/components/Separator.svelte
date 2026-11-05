<script lang="ts">
  /** The " · " between two parts of a line, with room around the font's narrow dot. */
  import { SEPARATOR } from "./separator";
</script>

<span class="separator">{SEPARATOR}</span>

<style>
  .separator {
    padding: 0 var(--gl-separator-room);
  }
</style>
