/**
 * Conversion between the editor's stored HTML and a markdown representation,
 * used by the RichEditor's markdown mode. Media embeds (audio/video) pass
 * through as raw HTML, like standard markdown allows.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMdToHtml(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/\*([^*]+)\*/g, '<i>$1</i>');
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  return s;
}

const RAW_HTML_LINE = /^<(audio|video|img)\b/i;
const BLOCK_START = /^(#{1,3} |```|> |>$|\s*[-*] |\s*\d+\. |<(audio|video|img)\b)/i;

export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++; // closing fence
      out.push(`<pre>${escapeHtml(buf.join('\n'))}</pre>`);
      continue;
    }
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(`<h3>${inlineMdToHtml(line.slice(4))}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('## ') || line.startsWith('# ')) {
      out.push(`<h2>${inlineMdToHtml(line.replace(/^#{1,2} /, ''))}</h2>`);
      i++;
      continue;
    }
    if (/^\s*[-*] /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(`<li>${inlineMdToHtml(lines[i].replace(/^\s*[-*] /, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    if (/^\s*\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\. /.test(lines[i])) {
        items.push(`<li>${inlineMdToHtml(lines[i].replace(/^\s*\d+\. /, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join('')}</ol>`);
      continue;
    }
    if (line.startsWith('> ') || line === '>') {
      const buf: string[] = [];
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        buf.push(lines[i].replace(/^> ?/, ''));
        i++;
      }
      out.push(`<blockquote>${inlineMdToHtml(buf.join(' '))}</blockquote>`);
      continue;
    }
    if (RAW_HTML_LINE.test(line.trim())) {
      out.push(line.trim());
      i++;
      continue;
    }
    // Paragraph: merge consecutive plain lines
    const buf: string[] = [line];
    i++;
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !BLOCK_START.test(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    out.push(`<p>${inlineMdToHtml(buf.join(' '))}</p>`);
  }
  return out.join('');
}

function inlineNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';
  const inner = [...node.childNodes].map(inlineNode).join('');
  switch (node.tagName) {
    case 'B':
    case 'STRONG':
      return inner ? `**${inner}**` : '';
    case 'I':
    case 'EM':
      return inner ? `*${inner}*` : '';
    case 'A':
      return `[${inner}](${node.getAttribute('href') ?? ''})`;
    case 'CODE':
      return `\`${inner}\``;
    case 'IMG':
      return `![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`;
    case 'BR':
      return '\n';
    default:
      return inner;
  }
}

/** Runs in the browser (uses DOMParser); the editor only calls it client-side. */
export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: string[] = [];

  function inlineOf(el: Element): string {
    return [...el.childNodes].map(inlineNode).join('').trim();
  }

  function walk(node: ChildNode): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').trim();
      if (t) blocks.push(t);
      return;
    }
    if (!(node instanceof Element)) return;
    switch (node.tagName) {
      case 'H1':
      case 'H2':
        blocks.push(`## ${inlineOf(node)}`);
        break;
      case 'H3':
        blocks.push(`### ${inlineOf(node)}`);
        break;
      case 'UL':
        blocks.push(
          [...node.children].map((li) => `- ${[...li.childNodes].map(inlineNode).join('').trim()}`).join('\n')
        );
        break;
      case 'OL':
        blocks.push(
          [...node.children]
            .map((li, idx) => `${idx + 1}. ${[...li.childNodes].map(inlineNode).join('').trim()}`)
            .join('\n')
        );
        break;
      case 'BLOCKQUOTE':
        blocks.push(
          inlineOf(node)
            .split('\n')
            .map((l) => `> ${l}`)
            .join('\n')
        );
        break;
      case 'PRE':
        blocks.push('```\n' + (node.textContent ?? '').replace(/\n$/, '') + '\n```');
        break;
      case 'IMG':
        blocks.push(`![${node.getAttribute('alt') ?? ''}](${node.getAttribute('src') ?? ''})`);
        break;
      case 'AUDIO':
      case 'VIDEO':
        blocks.push(node.outerHTML);
        break;
      case 'DIV':
        // contenteditable wraps lines in divs; recurse if it holds blocks
        if (node.querySelector('h1,h2,h3,p,ul,ol,blockquote,pre,img,audio,video,div')) {
          [...node.childNodes].forEach(walk);
        } else {
          const t = inlineOf(node);
          if (t) blocks.push(t);
        }
        break;
      default: {
        const t = inlineOf(node);
        if (t) blocks.push(t);
      }
    }
  }

  [...doc.body.childNodes].forEach(walk);
  return blocks.join('\n\n') + (blocks.length ? '\n' : '');
}
