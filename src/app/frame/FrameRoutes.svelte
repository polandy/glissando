<script lang="ts">
  import type { Route } from "../navigation/route";
  import type { Navigator } from "../navigation/navigator";
  import type { AppServices } from "../services";
  import FrameLayer from "./FrameLayer.svelte";
  import FrameSetupRoute from "./FrameSetupRoute.svelte";

  /** The picture frame's set-up and running screens, over the start screen (`dev-docs/app/FRAME.md`). */
  let {
    route,
    services,
    navigator,
  }: {
    route: Route;
    services: AppServices;
    navigator: Pick<Navigator, "back" | "open">;
  } = $props();
</script>

{#if route.screen === "frameSetup"}
  <FrameSetupRoute
    immich={services.immich}
    preferences={services.framePreferences}
    device={services.frameDevice}
    onBack={() => navigator.back()}
    onStart={(albumId) => navigator.open({ screen: "frame", albumId })}
  />
{/if}
{#if route.screen === "frame"}
  <FrameLayer
    albumId={route.albumId}
    immich={services.immich}
    preferences={services.framePreferences}
    device={services.frameDevice}
    onExit={() => navigator.back()}
    log={services.log}
  />
{/if}
