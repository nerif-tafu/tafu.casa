<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import RichEditor from '$lib/components/RichEditor.svelte';
  import { formatDate } from '$lib/date';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type Tab = 'projects' | 'sites' | 'maintenance' | 'metrics';
  const tabs: { id: Tab; label: string }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'sites', label: 'Sites' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'metrics', label: 'Metrics' }
  ];

  /** Active tab comes from the URL: /admin?tab=<id> */
  $: tab = (tabs.some((t) => t.id === $page.url.searchParams.get('tab'))
    ? $page.url.searchParams.get('tab')
    : 'projects') as Tab;

  const today = new Date().toISOString().slice(0, 10);

  /**
   * Post being edited comes from the URL: /admin?tab=projects&edit=<slug|new>.
   * Kept in a stable object so data invalidations don't clobber in-progress edits.
   */
  let editingPost: { id: string; title: string; date: string; html: string } | null = null;
  $: syncEditing($page.url.searchParams.get('edit'), data.posts);

  function syncEditing(param: string | null, posts: PageData['posts']) {
    if (!param) {
      editingPost = null;
      return;
    }
    if (param === 'new') {
      if (!editingPost || editingPost.id !== '') {
        editingPost = { id: '', title: '', date: today, html: '' };
      }
      return;
    }
    const post = posts.find((p) => p.slug === param);
    if (!post) {
      editingPost = null;
      return;
    }
    if (!editingPost || editingPost.id !== post.id) {
      editingPost = { id: post.id, title: post.title, date: post.date, html: post.html };
    }
  }

  let addingSite = false;

  const input =
    'w-full bg-[#242827] border border-[#4a4a4a] px-2 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-white';
  const btn = 'border border-white px-3 py-1 hover:bg-white hover:text-[#2f2f2f] whitespace-nowrap';
  const btnGhost = 'border border-[#4a4a4a] px-3 py-1 hover:border-white whitespace-nowrap';
  const btnDanger =
    'border border-red-400 text-red-400 px-3 py-1 hover:bg-red-400 hover:text-[#2f2f2f] whitespace-nowrap';
  const tabBtn = 'px-3 py-1 border-b-2';
  const th = 'text-left font-bold border-b border-[#4a4a4a] px-2 py-1';
  const td = 'border-b border-[#3a3e3d] px-2 py-1 align-top';

  /** After saving a post, return to the list URL */
  const savePostEnhance: SubmitFunction = () => {
    return async ({ result, update }) => {
      await update();
      if (result.type === 'success') await goto('/admin?tab=projects');
    };
  };

  /** Close the add-site form after a successful save */
  const addSiteEnhance: SubmitFunction = () => {
    return async ({ result, update }) => {
      await update();
      if (result.type === 'success') addingSite = false;
    };
  };

  /** Ask before deleting */
  const confirmDelete: SubmitFunction = ({ cancel }) => {
    if (!window.confirm('Delete this entry?')) cancel();
    return async ({ update }) => {
      await update();
    };
  };

  /** Ask before overwriting the database */
  const confirmRestore: SubmitFunction = ({ cancel }) => {
    if (!window.confirm('Restoring replaces ALL current sites and projects. Continue?')) cancel();
    return async ({ update }) => {
      await update();
    };
  };

  /** Recent-activity pagination */
  const RECENT_PER_PAGE = 10;
  let recentPage = 0;
  $: recentTotalPages = data.metrics
    ? Math.max(1, Math.ceil(data.metrics.recent.length / RECENT_PER_PAGE))
    : 1;
  $: if (recentPage >= recentTotalPages) recentPage = recentTotalPages - 1;
  $: recentSlice = data.metrics
    ? data.metrics.recent.slice(recentPage * RECENT_PER_PAGE, (recentPage + 1) * RECENT_PER_PAGE)
    : [];

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>tafu.casa - admin</title>
  <meta name="robots" content="noindex" />
</svelte:head>

{#if !data.authed}
  <div class="max-w-xs mx-auto py-12">
    <h3 class="text-lg font-bold mb-4">Admin sign in</h3>
    <form method="POST" action="?/login" use:enhance class="space-y-3">
      <input
        class={input}
        type="password"
        name="password"
        placeholder="Password"
        autocomplete="current-password"
        required
      />
      {#if form?.error}
        <p class="text-red-400">{form.error}</p>
      {/if}
      <button class={btn} type="submit">Sign in</button>
    </form>
  </div>
{:else}
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-lg font-bold">Admin</h3>
    <form method="POST" action="?/logout" use:enhance>
      <button class="opacity-70 hover:opacity-100 underline" type="submit">Sign out</button>
    </form>
  </div>

  <nav class="flex gap-2 border-b border-[#4a4a4a] mb-6">
    {#each tabs as t (t.id)}
      <a
        href="/admin?tab={t.id}"
        class="{tabBtn} {tab === t.id
          ? 'border-white font-bold'
          : 'border-transparent opacity-70 hover:opacity-100'}">{t.label}</a
      >
    {/each}
  </nav>

  {#if form?.error}
    <p class="text-red-400 mb-4">{form.error}</p>
  {/if}

  {#if tab === 'projects'}
    {#if editingPost}
      <form method="POST" action="?/savePost" use:enhance={savePostEnhance} class="space-y-3">
        <input type="hidden" name="id" value={editingPost.id} />
        <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
          <input class={input} name="title" value={editingPost.title} placeholder="Title" required />
          <input class={input} type="date" name="date" value={editingPost.date} required />
        </div>
        <RichEditor name="html" value={editingPost.html} />
        <div class="flex gap-2">
          <button class={btn} type="submit">Save</button>
          <a class={btnGhost} href="/admin?tab=projects">Cancel</a>
        </div>
      </form>
    {:else}
      <div class="flex items-center justify-between mb-4">
        <p class="opacity-70">Writeups shown on the Projects page.</p>
        <a class={btn} href="/admin?tab=projects&edit=new">+ New project</a>
      </div>

      {#if data.posts.length === 0}
        <p>No projects yet.</p>
      {:else}
        <div class="space-y-2">
          {#each data.posts as post (post.id)}
            <div class="flex items-center gap-4 border border-[#4a4a4a] px-3 py-2">
              <span class="text-[#778899] whitespace-nowrap">{formatDate(post.date)}</span>
              <a
                href="/projects/{post.slug}"
                class="flex-1 truncate underline hover:no-underline"
                title="View /projects/{post.slug}">{post.title}</a
              >
              <a class={btnGhost} href="/admin?tab=projects&edit={post.slug}">Edit</a>
              <form method="POST" action="?/deletePost" use:enhance={confirmDelete}>
                <input type="hidden" name="id" value={post.id} />
                <button class={btnDanger} type="submit">Delete</button>
              </form>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  {:else if tab === 'sites'}
    <p class="opacity-70 mb-4">The list of links shown on the homepage.</p>

    <div class="space-y-3">
      {#each data.projects as site (site.id)}
        <form
          method="POST"
          action="?/updateSite"
          use:enhance
          class="grid grid-cols-1 md:grid-cols-[1fr_1.3fr_1.3fr_auto_auto] gap-2 items-start"
        >
          <input type="hidden" name="id" value={site.id} />
          <input class={input} name="title" value={site.title} placeholder="Title" required />
          <input class={input} name="url" value={site.url} placeholder="URL (optional)" />
          <input
            class={input}
            name="description"
            value={site.description}
            placeholder="Description (optional)"
          />
          <button class={btnGhost} type="submit">Save</button>
          <button
            class={btnDanger}
            type="submit"
            formaction="?/deleteSite"
            on:click={(e) => {
              if (!window.confirm('Delete this entry?')) e.preventDefault();
            }}>Delete</button
          >
        </form>
      {/each}
    </div>

    {#if addingSite}
      <form
        method="POST"
        action="?/addSite"
        use:enhance={addSiteEnhance}
        class="mt-6 border border-[#4a4a4a] p-4 space-y-2"
      >
        <p class="font-bold mb-2">New site</p>
        <input class={input} name="title" placeholder="Title" required />
        <input class={input} name="url" placeholder="URL (optional)" />
        <input class={input} name="description" placeholder="Description (optional)" />
        <div class="flex gap-2 pt-2">
          <button class={btn} type="submit">Add</button>
          <button class={btnGhost} type="button" on:click={() => (addingSite = false)}>Cancel</button>
        </div>
      </form>
    {:else}
      <button class="{btn} mt-6" on:click={() => (addingSite = true)}>+ Add site</button>
    {/if}
  {:else if tab === 'maintenance'}
    <p class="opacity-70 mb-4">
      Back up or restore the site database (sites + project writeups) including all uploaded media
      files.
    </p>

    <div class="border border-[#4a4a4a] p-4 mb-4">
      <p class="font-bold mb-1">Download database</p>
      <p class="opacity-70 mb-3">Exports everything as a single .tar archive.</p>
      <a class="{btn} inline-block" href="/admin/backup" download>Download</a>
    </div>

    <div class="border border-[#4a4a4a] p-4">
      <p class="font-bold mb-1">Restore database</p>
      <p class="opacity-70 mb-3">
        Upload a previously downloaded backup (.tar). This replaces all current sites and projects
      </p>
      <form
        method="POST"
        action="?/restore"
        enctype="multipart/form-data"
        use:enhance={confirmRestore}
        class="space-y-3"
      >
        <input
          type="file"
          name="backup"
          accept=".tar,.json,application/x-tar,application/json"
          required
          class="block"
        />
        <button class={btn} type="submit">Upload &amp; restore</button>
      </form>
      {#if form?.restored}
        <p class="text-green-400 mt-3">Database restored.</p>
      {/if}
    </div>
  {:else if tab === 'metrics' && data.metrics}
    <p class="opacity-70 mb-6">
      {data.metrics.totalVisits} page views · {data.metrics.uniqueIps} unique visitors
    </p>

    <p class="font-bold mb-2">Per page</p>
    <div class="overflow-x-auto mb-8">
      <table class="w-full">
        <thead>
          <tr><th class={th}>Page</th><th class={th}>Views</th><th class={th}>Unique</th></tr>
        </thead>
        <tbody>
          {#each data.metrics.pages as page_ (page_.path)}
            <tr>
              <td class={td}>{page_.path}</td>
              <td class={td}>{page_.views}</td>
              <td class={td}>{page_.unique}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="font-bold mb-2">Top visitors</p>
    <div class="overflow-x-auto mb-8">
      <table class="w-full">
        <thead>
          <tr>
            <th class={th}>IP</th>
            <th class={th}>Location</th>
            <th class={th}>Views</th>
            <th class={th}>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {#each data.metrics.topVisitors as visitor (visitor.ip)}
            <tr>
              <td class={td}>{visitor.ip}</td>
              <td class={td}>{visitor.location}</td>
              <td class={td}>{visitor.views}</td>
              <td class={td}>{formatTime(visitor.lastSeen)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <p class="font-bold mb-2">Recent activity</p>
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr>
            <th class={th}>Time</th>
            <th class={th}>IP</th>
            <th class={th}>Location</th>
            <th class={th}>Page</th>
          </tr>
        </thead>
        <tbody>
          {#each recentSlice as event, i (i)}
            <tr>
              <td class={td}>{formatTime(event.ts)}</td>
              <td class={td}>{event.ip}</td>
              <td class={td}>{event.location}</td>
              <td class={td}>{event.path}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="flex items-center gap-3 mt-3">
      <button
        class="{btnGhost} disabled:opacity-40"
        disabled={recentPage === 0}
        on:click={() => (recentPage -= 1)}>&larr; Newer</button
      >
      <span class="opacity-70">Page {recentPage + 1} of {recentTotalPages}</span>
      <button
        class="{btnGhost} disabled:opacity-40"
        disabled={recentPage >= recentTotalPages - 1}
        on:click={() => (recentPage += 1)}>Older &rarr;</button
      >
    </div>
  {/if}
{/if}
