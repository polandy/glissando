<script lang="ts">
  import StartLogo from "./start/StartLogo.svelte";

  let { playStartAnimation }: { playStartAnimation: boolean } = $props();
</script>

<main>
  <StartLogo play={playStartAnimation} />
</main>

<style>
  main {
    display: grid;
    place-items: center;
    min-height: 100dvh;
  }
</style>
