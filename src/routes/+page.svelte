<script lang="ts">
  import { onMount } from 'svelte';
  import { ascii40, ascii60, ascii100 } from '$lib/ascii';
  import type { PageData } from './$types';

  export let data: PageData;

  /** Use initial viewport width from inline script so art size is correct on first paint (no resize) */
  let width =
    typeof window !== 'undefined'
      ? (window as typeof window & { __INITIAL_VIEWPORT_WIDTH__?: number }).__INITIAL_VIEWPORT_WIDTH__ ?? 0
      : 0;
  /** Full-screen ASCII bunny splash on page load, fades out to reveal content */
  let hideIntro = false;

  const wiggleChars = "nerif's".split('');

  function updateWidth() {
    width = typeof window !== 'undefined' ? window.innerWidth : 0;
  }

  onMount(() => {
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const timer = setTimeout(() => {
      hideIntro = true;
    }, 1200);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  });

  $: introArt = width >= 1024 ? ascii100 : width >= 640 ? ascii60 : ascii40;
  $: pageArt = width >= 640 ? ascii60 : ascii40;
</script>

<svelte:head>
  <title>tafu.casa</title>
  <meta name="description" content="tafu.casa — assorted projects and random writeups" />
</svelte:head>

<!-- Page-load ASCII bunny splash -->
<div
  class="fixed inset-0 z-10 bg-[#242827] flex items-center justify-center transition-opacity duration-500 {hideIntro
    ? 'opacity-0 pointer-events-none'
    : ''}"
  aria-hidden={hideIntro}
>
  <pre class="inline-block text-[10px] leading-none whitespace-pre text-left">{introArt}</pre>
</div>

<h3 class="text-lg font-bold mt-6 mb-2">About</h3>
<p>
  Welcome to <span class="wiggle" aria-label="nerif's"
    >{#each wiggleChars as ch, i}<span style="animation-delay: {i * 0.1}s" aria-hidden="true"
        >{ch}</span
      >{/each}</span
  > home, you'll find some assorted projects and random writeups here. You can find my contact
  info at the bottom of the page.
</p>

<h3 id="sites" class="text-lg font-bold mt-6 mb-2">Sites</h3>
{#if data.projects.length === 0}
  <p>Nothing here yet.</p>
{:else}
  <ul class="list-disc pl-6 space-y-1">
    {#each data.projects as project (project.id)}
      <li>
        {#if project.url}
          <a href={project.url} class="underline hover:no-underline">{project.title}</a>
        {:else}
          {project.title}
        {/if}
        {#if project.description}
          — {project.description}
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<div class="flex justify-center mt-8">
  <pre class="inline-block text-[8px] leading-none whitespace-pre text-left" aria-hidden="true">{pageArt}</pre>
</div>

<style>
  .wiggle :global(span) {
    display: inline-block;
    animation: wiggle 0.9s ease-in-out infinite;
  }

  @keyframes wiggle {
    0%,
    100% {
      transform: translateY(0);
    }
    25% {
      transform: translateY(-2px) rotate(-3deg);
    }
    75% {
      transform: translateY(1px) rotate(3deg);
    }
  }
</style>
