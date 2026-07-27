<script lang="ts">
  import { formatDate } from '$lib/date';
  import type { PageData } from './$types';

  export let data: PageData;

  $: og = data.og;
</script>

<svelte:head>
  <title>tafu.casa - {data.post.title}</title>
  <meta name="description" content={og.description} />

  <meta property="og:site_name" content={og.siteName} />
  <meta property="og:title" content={og.title} />
  <meta property="og:description" content={og.description} />
  <meta property="og:url" content={og.url} />
  <meta property="og:type" content="article" />
  <meta property="og:image" content={og.image} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={og.title} />
  <meta name="twitter:description" content={og.description} />
  <meta name="twitter:image" content={og.image} />

  <link rel="canonical" href={og.url} />
</svelte:head>

<h3 class="text-lg font-bold mb-1">{data.post.title}</h3>
<p class="text-[#778899] mb-4">{formatDate(data.post.date)}</p>

{#if !data.post.active}
  <p class="mb-4 opacity-50 text-sm">This project is deactivated.</p>
{/if}

<!-- eslint-disable-next-line svelte/no-at-html-tags -- admin-authored content -->
<div class="rich-text">{@html data.post.html}</div>

<p class="mt-8">
  <a href="/projects" class="underline hover:no-underline">&larr; Back to projects</a>
</p>
