<script lang="ts">
  import { formatDate } from '$lib/date';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<svelte:head>
  <title>tafu.casa - {data.post.title}</title>
</svelte:head>

<h3 class="text-lg font-bold mb-1">{data.post.title}</h3>
<p class="text-[#778899] mb-4">{formatDate(data.post.date)}</p>

<!-- eslint-disable-next-line svelte/no-at-html-tags -- admin-authored content -->
<div class="rich-text">{@html data.post.html}</div>

<p class="mt-8">
  <a href="/projects" class="underline hover:no-underline">&larr; Back to projects</a>
</p>
