<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { htmlToMarkdown, markdownToHtml } from '$lib/markdown';
  import { videoEmbedHtml } from '$lib/video';

  /** Name of the hidden form field carrying the HTML */
  export let name = 'html';
  /** Initial HTML content */
  export let value = '';

  let mdTextarea: HTMLTextAreaElement | undefined;
  let backdropEl: HTMLPreElement | undefined;
  let fileInput: HTMLInputElement;
  let current = value;
  let mdText = '';
  let mode: 'markdown' | 'preview' = 'markdown';
  let pendingKind: 'image' | 'audio' | 'video' = 'image';

  /** Active uploads: token is the reserved `/media/<uuid>.<ext>` (or uploading: id) */
  type UploadJob = { id: string; snippet: string; progress: number };
  let uploads: UploadJob[] = [];

  $: uploadProgress =
    uploads.length === 0
      ? null
      : Math.round(uploads.reduce((s, u) => s + u.progress, 0) / uploads.length);

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

  /** Insert snippet at a fixed offset (does not re-read the cursor). */
  async function insertAt(start: number, end: number, snippet: string) {
    const block = `\n${snippet}\n`;
    mdText = `${mdText.slice(0, start)}${block}${mdText.slice(end)}`;
    syncFromMd();
    await tick();
    const ta = mdTextarea;
    if (ta) {
      ta.focus();
      const pos = start + block.length;
      ta.setSelectionRange(pos, pos);
    }
    return block;
  }

  function removeSnippet(snippet: string) {
    const block = `\n${snippet}\n`;
    if (mdText.includes(block)) {
      mdText = mdText.replace(block, '\n');
    } else {
      mdText = mdText.replace(snippet, '');
    }
    syncFromMd();
  }

  function pickMedia(kind: 'image' | 'audio' | 'video') {
    pendingKind = kind;
    fileInput.accept = kind === 'image' ? 'image/*' : kind === 'audio' ? 'audio/*' : 'video/*';
    fileInput.value = '';
    fileInput.click();
  }

  function mediaSnippet(
    kind: 'image' | 'audio' | 'video',
    url: string,
    hdrUrl?: string | null
  ): string {
    if (kind === 'image') return `![](${url})`;
    if (kind === 'audio') return `<audio controls src="${url}"></audio>`;
    return videoEmbedHtml(url, hdrUrl);
  }

  function uploadWithProgress(
    file: File,
    reservedName: string,
    onProgress: (pct: number) => void
  ): Promise<{ url: string; hdrUrl?: string | null }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/admin/upload');
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let body: { url?: string; hdrUrl?: string | null; message?: string } = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* keep empty */
        }
        if (xhr.status >= 200 && xhr.status < 300 && body.url) {
          onProgress(100);
          resolve({ url: body.url, hdrUrl: body.hdrUrl ?? null });
        } else {
          reject(new Error(body.message ?? `Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error('Upload failed'));
      xhr.onabort = () => reject(new Error('Upload aborted'));
      const body = new FormData();
      body.append('file', file);
      body.append('name', reservedName);
      xhr.send(body);
    });
  }

  async function handleFile() {
    const file = fileInput.files?.[0];
    if (!file) return;

    // Lock insertion point before the async upload so a moved cursor cannot
    // drop the embed somewhere else.
    const ta = mdTextarea;
    const start = ta?.selectionStart ?? mdText.length;
    const end = ta?.selectionEnd ?? mdText.length;

    // Videos always use .mp4 primary (server may also write uuid.hdr.*)
    const srcExt = (file.name.split('.').pop() ?? '').toLowerCase();
    const reservedExt =
      pendingKind === 'video' ? 'mp4' : srcExt;
    const reservedName = `${crypto.randomUUID()}.${reservedExt}`;
    const url = `/media/${reservedName}`;
    const snippet = mediaSnippet(pendingKind, url);
    const id = reservedName;

    await insertAt(start, end, snippet);
    uploads = [...uploads, { id, snippet, progress: 0 }];

    try {
      const result = await uploadWithProgress(file, reservedName, (pct) => {
        uploads = uploads.map((u) => (u.id === id ? { ...u, progress: pct } : u));
      });
      if (pendingKind === 'video' && result.hdrUrl) {
        const finalSnippet = mediaSnippet('video', result.url, result.hdrUrl);
        if (mdText.includes(snippet)) {
          mdText = mdText.replace(snippet, finalSnippet);
          syncFromMd();
        }
      }
    } catch (e) {
      removeSnippet(snippet);
      window.alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      uploads = uploads.filter((u) => u.id !== id);
    }
  }

  /** Highlight pending upload snippets as greyed-out in the markdown backdrop. */
  function backdropHtml(text: string, jobs: UploadJob[]): string {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let html = esc(text);
    for (const job of jobs) {
      const needle = esc(job.snippet);
      if (!needle) continue;
      html = html.split(needle).join(`<span class="upload-ph">${needle}</span>`);
    }
    // Trailing newline is invisible in a <pre> unless padded
    if (text.endsWith('\n')) html += ' ';
    return html;
  }

  $: highlighted = backdropHtml(mdText, uploads);
  $: uploading = uploads.length > 0;

  function syncBackdropScroll() {
    if (!backdropEl || !mdTextarea) return;
    backdropEl.scrollTop = mdTextarea.scrollTop;
    backdropEl.scrollLeft = mdTextarea.scrollLeft;
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
          disabled={mode === 'preview'}
          on:mousedown|preventDefault
          on:click={tool.action}
        >
          {tool.label}
        </button>
      {/each}
      {#if uploadProgress !== null}
        <span class="pl-2 opacity-40" aria-live="polite">uploading {uploadProgress}%</span>
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
    <div class="editor-wrap relative w-full min-h-[180px] h-[calc(100vh-530px)]">
      {#if uploading}
        <!-- Backdrop greys out pending ![](/media/…) (and audio/video) embeds -->
        <pre
          bind:this={backdropEl}
          class="editor-backdrop pointer-events-none absolute inset-0 m-0 overflow-hidden p-3 whitespace-pre-wrap break-words"
          aria-hidden="true">{@html highlighted}</pre>
      {/if}
      <textarea
        bind:this={mdTextarea}
        bind:value={mdText}
        on:input={syncFromMd}
        on:scroll={syncBackdropScroll}
        class="editor-surface relative z-[1] w-full h-full min-h-[180px] p-3 bg-transparent focus:outline-none resize-y {uploading
          ? 'text-transparent caret-white'
          : 'text-white'}"
        spellcheck="false"
        aria-label="Post content (markdown)"
      ></textarea>
    </div>
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

<style>
  .editor-wrap .editor-backdrop,
  .editor-wrap .editor-surface {
    font-family: 'Anonymous Pro', monospace;
    font-size: 16px;
    line-height: 1.5;
    letter-spacing: normal;
    tab-size: 2;
  }
  .editor-backdrop {
    color: #ffffff;
  }
  .editor-backdrop :global(.upload-ph) {
    opacity: 0.35;
  }
</style>
