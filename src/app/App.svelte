<script lang="ts">
  import logoLight from "../../assets/brand/logo-stacked-light.svg";
  import logoDark from "../../assets/brand/logo-stacked-dark.svg";
</script>

<main>
  <picture>
    <source srcset={logoDark} media="(prefers-color-scheme: dark)" />
    <img src={logoLight} alt="Glissando" width="400" height="270" />
  </picture>
</main>

<style>
  main {
    display: grid;
    place-items: center;
    min-height: 100dvh;
  }
</style>
