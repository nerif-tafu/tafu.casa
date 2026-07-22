<script lang="ts">
  import { formatDate } from '$lib/date';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>tafu.casa - projects</title>
  <meta name="description" content="Project writeups on tafu.casa" />
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
        <a href="/projects/{post.slug}" class="hover:underline">{post.title}</a>
      </div>
    {/each}
  </div>
{/if}
