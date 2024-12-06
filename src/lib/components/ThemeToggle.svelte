<script>
  import { onMount } from 'svelte';

  let darkMode = false;

  onMount(() => {
    // Check initial theme
    darkMode = document.documentElement.classList.contains('dark');
    
    // Watch for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) {
        darkMode = e.matches;
        updateTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    // Initial check for system preference
    if (!localStorage.getItem('theme')) {
      darkMode = mediaQuery.matches;
      updateTheme();
    }

    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  function toggleTheme() {
    darkMode = !darkMode;
    updateTheme();
  }

  function updateTheme() {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }
</script>

<button
  on:click={toggleTheme}
  class="fixed bottom-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-dark-lighter text-gray-800 dark:text-gray-200 transition-colors duration-200"
  aria-label="Toggle theme"
>
  {#if darkMode}
    <!-- Sun icon -->
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  {:else}
    <!-- Moon icon -->
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  {/if}
</button> 