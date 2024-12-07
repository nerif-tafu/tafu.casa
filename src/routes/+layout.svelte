<script>
  import "../app.css";
  import Loading from "$lib/components/Loading.svelte";
  import SplashScreen from "$lib/components/SplashScreen.svelte";
  import { navigating } from '$app/stores';
  import { onMount } from 'svelte';

  let showingSplash = true;
  let fontsLoaded = false;

  onMount(() => {
    document.fonts.ready.then(() => {
      fontsLoaded = true;
    });
  });
</script>

{#if showingSplash}
  <SplashScreen onComplete={() => showingSplash = false} />
{:else if $navigating || !fontsLoaded}
  <Loading />
{/if}

<slot /> 