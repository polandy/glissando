<script lang="ts">
  /** The " · " between two parts of a line, with room around the font's narrow dot. */
  import { SEPARATOR } from "./separator";
</script>

<span class="separator" data-testid="separator">{SEPARATOR}</span>

<style>
  /* Wider spaces rather than padding: a line that wraps at the dot drops its space, room included. */
  .separator {
    word-spacing: var(--gl-separator-room);
  }
</style>
