<script lang="ts">
  import { onMount } from 'svelte';
  import { ascii40, ascii60, ascii100 } from '$lib/ascii';

  /** Use initial viewport width from inline script so art size is correct on first paint (no resize) */
  let width =
    typeof window !== 'undefined'
      ? (window as typeof window & { __INITIAL_VIEWPORT_WIDTH__?: number }).__INITIAL_VIEWPORT_WIDTH__ ?? 0
      : 0;
  /** On single-column (mobile): overlay hides after 1s to reveal links */
  let hideMobileAscii = false;
  let mobileTimer: ReturnType<typeof setTimeout> | undefined;
  /** Fade-in for desktop layout (set true after mount) */
  let contentFadedIn = false;

  function updateWidth() {
    width = typeof window !== 'undefined' ? window.innerWidth : 0;
    if (mobileTimer) {
      clearTimeout(mobileTimer);
      mobileTimer = undefined;
    }
    if (width < 768) {
      hideMobileAscii = false;
      mobileTimer = setTimeout(() => {
        hideMobileAscii = true;
        mobileTimer = undefined;
      }, 1000);
    } else {
      hideMobileAscii = false;
    }
  }

  onMount(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth);
    if (width >= 768) {
      requestAnimationFrame(() => {
        contentFadedIn = true;
      });
    } else {
      contentFadedIn = true;
    }
    return () => {
      if (mobileTimer) clearTimeout(mobileTimer);
      window.removeEventListener('resize', updateWidth);
    };
  });

  $: art =
    width >= 1024
      ? ascii100
      : width >= 640
        ? ascii60
        : ascii40;
</script>

<svelte:head>
  <title>tafu.casa</title>
  <meta name="description" content="Minimal text homepage for tafu.casa" />
</svelte:head>

<main class="min-h-screen flex items-center justify-center px-4 py-8 relative">
  <!-- Mobile: full-screen ASCII overlay, fades out after 1s to reveal links -->
  {#if width < 768}
    <div
      class="fixed inset-0 z-10 bg-gray-950 flex items-center justify-center transition-opacity duration-500 {hideMobileAscii
        ? 'opacity-0 pointer-events-none'
        : ''}"
      aria-hidden={hideMobileAscii}
    >
      <pre
        class="inline-block text-[10px] leading-none text-gray-200 whitespace-pre text-left"
      >{art}</pre>
    </div>
  {/if}

  <div
    class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 md:gap-12 items-center transition-opacity duration-500 ease-out {width >= 768 && !contentFadedIn
      ? 'opacity-0'
      : 'opacity-100'}"
  >
    <div class="flex flex-col space-y-8 text-left">
      <section class="space-y-8 text-sm text-gray-300">
        <div class="space-y-3">
          <p class="tracking-wide uppercase text-gray-400">links</p>
          <ul class="space-y-1">
            <li class="whitespace-nowrap">- <a
                href="https://pipes.tafu.casa/"
                class="underline decoration-gray-500 hover:text-gray-100 hover:decoration-gray-200"
                >pipes.tafu.casa</a
              ></li>
            <li class="whitespace-nowrap">- <a
                href="https://spermket.tafu.casa/shop/undercut"
                class="underline decoration-gray-500 hover:text-gray-100 hover:decoration-gray-200"
                >spermket.tafu.casa</a
              ></li>
          </ul>
        </div>
        <div class="space-y-3">
          <p class="tracking-wide uppercase text-gray-400">profiles</p>
          <ul class="space-y-1">
            <li class="whitespace-nowrap">- <a
                href="https://github.com/nerif-tafu?tab=repositories"
                class="underline decoration-gray-500 hover:text-gray-100 hover:decoration-gray-200"
                >GH</a
              ></li>
            <li class="whitespace-nowrap">- <a
                href="https://discordapp.com/users/107411599001710592"
                class="underline decoration-gray-500 hover:text-gray-100 hover:decoration-gray-200"
                >Discord</a
              ></li>
          </ul>
        </div>
      </section>
    </div>
    <!-- Desktop only: ASCII in second column -->
    {#if width >= 768}
      <section class="overflow-x-auto flex items-start justify-center">
        <pre
          class="inline-block text-[10px] leading-none text-gray-200 whitespace-pre text-left"
        >{art}</pre>
      </section>
    {/if}
  </div>
</main>

