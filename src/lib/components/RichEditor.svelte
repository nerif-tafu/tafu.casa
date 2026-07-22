<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { htmlToMarkdown, markdownToHtml } from '$lib/markdown';

  /** Name of the hidden form field carrying the HTML */
  export let name = 'html';
  /** Initial HTML content */
  export let value = '';

  let mdTextarea: HTMLTextAreaElement | undefined;
  let fileInput: HTMLInputElement;
  let current = value;
  let mdText = '';
  let mode: 'markdown' | 'preview' = 'markdown';
  let uploading = false;
  let pendingKind: 'image' | 'audio' | 'video' = 'image';

  onMount(() => {
    mdText = htmlToMarkdown(value);
  });

  function syncFromMd() {
    current = markdownToHtml(mdText);
  }

  function setMode(next: 'markdown' | 'preview') {
    if (next === mode) return;
    if (next === 'preview') syncFromMd();
    mode = next;
  }

  /** Wrap the selection (or a placeholder) with markdown markers */
  async function applySurround(before: string, after: string = before, placeholder = 'text') {
    const ta = mdTextarea;
    if (!ta) return;
    const start = ta.selectionStart ?? mdText.length;
    const end = ta.selectionEnd ?? mdText.length;
    const sel = mdText.slice(start, end) || placeholder;
    mdText = mdText.slice(0, start) + before + sel + after + mdText.slice(end);
    syncFromMd();
    await tick();
    ta.focus();
    ta.setSelectionRange(start + before.length, start + before.length + sel.length);
  }

  /** Prefix every selected line (e.g. headings, lists, quotes) */
  async function applyLinePrefix(prefix: string, numbered = false) {
    const ta = mdTextarea;
    if (!ta) return;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    const lineStart = mdText.lastIndexOf('\n', start - 1) + 1;
    const nl = mdText.indexOf('\n', end);
    const lineEnd = nl === -1 ? mdText.length : nl;
    const lines = mdText.slice(lineStart, lineEnd).split('\n');
    const replaced = lines.map((l, i) => (numbered ? `${i + 1}. ` : prefix) + l).join('\n');
    mdText = mdText.slice(0, lineStart) + replaced + mdText.slice(lineEnd);
    syncFromMd();
    await tick();
    ta.focus();
    ta.setSelectionRange(lineStart, lineStart + replaced.length);
  }

  async function applyLink() {
    const url = window.prompt('Link URL:');
    if (url) await applySurround('[', `](${url})`, 'link text');
  }

  async function applyCodeBlock() {
    await applySurround('\n```\n', '\n```\n', 'code');
  }

  async function insertSnippet(snippet: string) {
    const ta = mdTextarea;
    const start = ta?.selectionStart ?? mdText.length;
    const end = ta?.selectionEnd ?? mdText.length;
    mdText = `${mdText.slice(0, start)}\n${snippet}\n${mdText.slice(end)}`;
    syncFromMd();
    await tick();
    if (ta) {
      ta.focus();
      const pos = start + snippet.length + 2;
      ta.setSelectionRange(pos, pos);
    }
  }

  function pickMedia(kind: 'image' | 'audio' | 'video') {
    pendingKind = kind;
    fileInput.accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';
    fileInput.value = '';
    fileInput.click();
  }

  async function handleFile() {
    const file = fileInput.files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/admin/upload', { method: 'POST', body });
      if (!res.ok) {
        let message = `Upload failed (${res.status})`;
        try {
          message = (await res.json()).message ?? message;
        } catch {
          /* keep default */
        }
        throw new Error(message);
      }
      const { url } = await res.json();
      const snippet =
        pendingKind === 'image'
          ? `![](${url})`
          : pendingKind === 'audio'
            ? `<audio controls src="${url}"></audio>`
            : `<video controls src="${url}"></video>`;
      await insertSnippet(snippet);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      uploading = false;
    }
  }

  const tools: { label: string; title: string; action: () => void; cls?: string }[] = [
    { label: 'B', title: 'Bold', action: () => applySurround('**'), cls: 'font-bold' },
    { label: 'I', title: 'Italic', action: () => applySurround('*'), cls: 'italic' },
    { label: 'H2', title: 'Heading', action: () => applyLinePrefix('## ') },
    { label: 'H3', title: 'Subheading', action: () => applyLinePrefix('### ') },
    { label: '• list', title: 'Bullet list', action: () => applyLinePrefix('- ') },
    { label: '1. list', title: 'Numbered list', action: () => applyLinePrefix('', true) },
    { label: 'link', title: 'Insert link', action: applyLink },
    { label: 'code', title: 'Code block', action: applyCodeBlock },
    { label: 'quote', title: 'Quote', action: () => applyLinePrefix('> ') },
    { label: 'photo', title: 'Insert photo', action: () => pickMedia('image') },
    { label: 'audio', title: 'Insert audio', action: () => pickMedia('audio') },
    { label: 'video', title: 'Insert video', action: () => pickMedia('video') }
  ];

  const modeBtn = 'px-2 py-0.5 border';
</script>

<div class="border border-[#4a4a4a] bg-[#242827]">
  <div class="flex items-start justify-between gap-3 border-b border-[#4a4a4a] p-2">
    <div class="flex flex-wrap items-center gap-1">
      {#each tools as tool (tool.title)}
        <button
          type="button"
          class="px-2 py-0.5 border border-[#4a4a4a] hover:border-white hover:bg-[#2f2f2f] disabled:opacity-40 disabled:hover:border-[#4a4a4a] disabled:hover:bg-transparent {tool.cls ?? ''}"
          title={tool.title}
          disabled={uploading || mode === 'preview'}
          on:mousedown|preventDefault
          on:click={tool.action}
        >
          {tool.label}
        </button>
      {/each}
      {#if uploading}
        <span class="pl-2 opacity-70">uploading…</span>
      {/if}
    </div>
    <div class="flex shrink-0" role="group" aria-label="Editor mode">
      <button
        type="button"
        class="{modeBtn} {mode === 'markdown'
          ? 'border-white bg-white text-[#242827] font-bold'
          : 'border-[#4a4a4a] hover:border-white'}"
        on:click={() => setMode('markdown')}>markdown</button
      >
      <button
        type="button"
        class="{modeBtn} -ml-px {mode === 'preview'
          ? 'border-white bg-white text-[#242827] font-bold'
          : 'border-[#4a4a4a] hover:border-white'}"
        on:click={() => setMode('preview')}>preview</button
      >
    </div>
  </div>
  {#if mode === 'markdown'}
    <textarea
      bind:this={mdTextarea}
      bind:value={mdText}
      on:input={syncFromMd}
      class="w-full min-h-[180px] h-[calc(100vh-530px)] p-3 bg-transparent text-white focus:outline-none resize-y"
      spellcheck="false"
      aria-label="Post content (markdown)"
    ></textarea>
  {:else}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- admin-authored content -->
    <div
      class="rich-text min-h-[180px] h-[calc(100vh-530px)] overflow-y-auto p-3"
      aria-label="Preview"
    >
      {@html current}
    </div>
  {/if}
</div>
<input type="hidden" {name} value={current} />
<input type="file" class="hidden" bind:this={fileInput} on:change={handleFile} />
