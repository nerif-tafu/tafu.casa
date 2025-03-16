<script>
  import { handleNavigation } from '$lib/stores/navigation';
  import { goto, afterNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { navigationState } from '$lib/stores/navigation';

  export let to = '';
  export let hidden = false;
  export let className = '';
  export let textLink = true;

  let isMobile = false;
  let isNavigating = false;

  onMount(() => {
    isMobile = 'ontouchstart' in window;
  });

  // Subscribe to navigation state
  navigationState.subscribe(state => {
    isNavigating = state.isNavigating;
  });

  async function handleClick(e) {
    e.preventDefault();
    // Always try handleNavigation first, only fallback to goto if it returns true
    if (await handleNavigation(to, false, true)) {
      return;
    }
    // If handleNavigation returned false (meaning it didn't handle the navigation)
    // then do a regular goto
    goto('/' + to);
  }
</script>

{#if hidden}
  <!-- Hidden link - no hover effects or visual indicators -->
  <span
    role="button"
    tabindex="0"
    class="inline-block {className}"
    class:text-cursor={textLink}
    class:default-cursor={!textLink}
    class:disable-hover={!isNavigating && isMobile}
    on:click={handleClick}
    on:keydown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick(e);
      }
    }}
  >
    <slot />
  </span>
{:else}
  <!-- Regular accessible link -->
  <a
    href="/{to}"
    class="no-underline text-inherit hover:text-white transition-colors duration-200 {className}"
    on:click|preventDefault={handleClick}
  >
    <slot />
  </a>
{/if}

<style>
  .text-cursor {
    cursor: text;
    user-select: text;
  }

  .default-cursor {
    cursor: default;
    user-select: none;
  }

  .disable-hover :global(.hover-float) {
    transform: none !important;
    transition: none !important;
  }
</style> 