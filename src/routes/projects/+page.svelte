<script lang="ts">
  import { formatDate } from '$lib/date';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>tafu.casa - projects</title>
  <meta name="description" content="Project writeups on tafu.casa" />
  <meta property="og:title" content="tafu.casa - projects" />
  <meta property="og:description" content="Project writeups on tafu.casa" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<h3 class="text-lg font-bold mb-2">Projects</h3>
<p>Writeups on things I've built, broken and tinkered with.</p>

{#if data.posts.length === 0}
  <p class="mt-4">Nothing here yet.</p>
{:else}
  <div class="mt-4 space-y-1">
    {#each data.posts as post (post.slug)}
      <div class="flex gap-4">
        <span class="text-[#778899] whitespace-nowrap">{formatDate(post.date)}</span>
        {#if post.active}
          <a href="/projects/{post.slug}" class="hover:underline">{post.title}</a>
        {:else}
          <span class="opacity-40 cursor-default" title="Deactivated">{post.title}</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}
