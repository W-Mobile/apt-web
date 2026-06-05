import { useEffect, useState, Fragment } from 'react';
import { getUrl } from 'aws-amplify/storage';
import { parseContent, type TiptapNode } from './postContent';

interface PostContentRendererProps {
  value: string;
  className?: string;
}

export function PostContentRenderer({ value, className }: PostContentRendererProps) {
  const doc = parseContent(value);
  return (
    <div
      className={
        className ??
        'text-stone-100 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
      }
    >
      {(doc.content ?? []).map((node, i) => (
        <RenderNode key={i} node={node} />
      ))}
    </div>
  );
}

function RenderNode({ node }: { node: TiptapNode }) {
  switch (node.type) {
    case 'paragraph': {
      const children = renderInline(node.content ?? []);
      return <p className="my-2 leading-relaxed">{children}</p>;
    }
    case 'bulletList':
      return (
        <ul className="list-disc pl-6 my-2 space-y-1">
          {(node.content ?? []).map((child, i) => (
            <RenderNode key={i} node={child} />
          ))}
        </ul>
      );
    case 'orderedList':
      return (
        <ol className="list-decimal pl-6 my-2 space-y-1">
          {(node.content ?? []).map((child, i) => (
            <RenderNode key={i} node={child} />
          ))}
        </ol>
      );
    case 'listItem':
      return (
        <li>
          {(node.content ?? []).map((child, i) => (
            <RenderNode key={i} node={child} />
          ))}
        </li>
      );
    case 'image':
      return <S3Image attrs={(node.attrs ?? {}) as Record<string, unknown>} />;
    case 'hardBreak':
      return <br />;
    default:
      // Unknown block — render its children if any, otherwise nothing.
      if (node.content) {
        return (
          <>
            {node.content.map((child, i) => (
              <RenderNode key={i} node={child} />
            ))}
          </>
        );
      }
      return null;
  }
}

function renderInline(nodes: TiptapNode[]): React.ReactNode {
  return nodes.map((node, i) => <InlineNode key={i} node={node} />);
}

function InlineNode({ node }: { node: TiptapNode }) {
  if (node.type !== 'text') {
    // Fallback for unexpected inline nodes (e.g. hardBreak)
    if (node.type === 'hardBreak') return <br />;
    return null;
  }

  let element: React.ReactNode = node.text ?? '';

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case 'bold':
        element = <strong>{element}</strong>;
        break;
      case 'italic':
        element = <em>{element}</em>;
        break;
      case 'underline':
        element = <u>{element}</u>;
        break;
      case 'link': {
        const href = (mark.attrs as { href?: string } | undefined)?.href ?? '#';
        element = (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#F24E1E] underline"
          >
            {element}
          </a>
        );
        break;
      }
      case 'code':
        element = (
          <code className="px-1 py-0.5 rounded bg-stone-800 text-sm">
            {element}
          </code>
        );
        break;
      default:
        break;
    }
  }

  return <Fragment>{element}</Fragment>;
}

function S3Image({ attrs }: { attrs: Record<string, unknown> }) {
  const src = typeof attrs.src === 'string' ? attrs.src : '';
  const alt = typeof attrs.alt === 'string' ? attrs.alt : '';
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(
    isUrl(src) ? src : null,
  );

  useEffect(() => {
    if (!src || isUrl(src)) return;
    let cancelled = false;
    getUrl({ path: src })
      .then(({ url }) => {
        if (!cancelled) setResolvedSrc(url.toString());
      })
      .catch(() => {
        if (!cancelled) setResolvedSrc(null);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolvedSrc) {
    return (
      <div className="my-3 h-32 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center text-xs text-stone-500">
        Laddar bild…
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className="my-3 rounded-lg max-w-full"
    />
  );
}

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value) || value.startsWith('data:');
}
