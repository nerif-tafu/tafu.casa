<script>
  import "../app.css";
  import ThemeToggle from "$lib/components/ThemeToggle.svelte";
  import Loading from "$lib/components/Loading.svelte";
  import { navigating } from '$app/stores';
  import { onMount } from 'svelte';

  onMount(() => {
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
</script>

{#if $navigating}
  <Loading />
{/if}

<slot />
<ThemeToggle /> 