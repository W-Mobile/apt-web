export interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: TiptapNode[];
  text?: string;
}

export interface TiptapDoc extends TiptapNode {
  type: 'doc';
  content?: TiptapNode[];
}

export function emptyDoc(): TiptapDoc {
  return { type: 'doc', content: [] };
}

export function paragraphDoc(text: string): TiptapDoc {
  if (text === '') {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  return {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text }] },
    ],
  };
}

function isTiptapDoc(value: unknown): value is TiptapDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc'
  );
}

export function parseContent(value: string): TiptapDoc {
  if (value.trim() === '') return emptyDoc();
  try {
    const parsed: unknown = JSON.parse(value);
    if (isTiptapDoc(parsed)) return parsed;
  } catch {
    // fall through — treat as legacy plain text
  }
  return paragraphDoc(value);
}

function walkText(node: TiptapNode, out: string[]): void {
  if (node.type === 'text' && typeof node.text === 'string') {
    out.push(node.text);
    return;
  }
  if (node.content) {
    for (const child of node.content) walkText(child, out);
  }
}

export function extractPlainText(value: string, maxChars?: number): string {
  if (value.trim() === '') return '';

  let text: string;
  try {
    const parsed: unknown = JSON.parse(value);
    if (isTiptapDoc(parsed)) {
      const parts: string[] = [];
      walkText(parsed, parts);
      text = parts.join(' ').replace(/\s+/g, ' ').trim();
    } else {
      // JSON parsed but not a doc — treat as legacy text
      text = value;
    }
  } catch {
    // Legacy plain-text post
    text = value;
  }

  if (maxChars != null && text.length > maxChars) {
    return text.slice(0, maxChars) + '…';
  }
  return text;
}
