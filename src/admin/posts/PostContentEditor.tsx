import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
} from 'lucide-react';
import { parseContent, emptyDoc } from './postContent';

interface PostContentEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const ACCENT = '#F24E1E';

export function PostContentEditor({ value, onChange }: PostContentEditorProps) {
  const initialDocRef = useRef(parseContent(value));

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full my-3',
        },
      }),
    ],
    content: initialDocRef.current,
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] px-4 py-3 bg-stone-800 text-white rounded-b-xl border border-t-0 border-stone-700 focus:outline-none focus:border-[#F24E1E] prose prose-invert max-w-none [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_p]:my-2 [&_a]:text-[#F24E1E] [&_a]:underline',
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // Don't emit "empty doc with empty paragraph" as a non-empty string —
      // PostForm uses string-emptiness to gate the submit button.
      if (isEmptyDoc(json)) {
        onChange('');
      } else {
        onChange(JSON.stringify(json));
      }
    },
    immediatelyRender: false,
  });

  // Sync external value changes (e.g. when loading an existing post after mount)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    const incoming = parseContent(value);
    if (JSON.stringify(current) !== JSON.stringify(incoming)) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[260px] bg-stone-800 rounded-xl border border-stone-700" />
    );
  }

  function handleAddLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', previous ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: url })
      .run();
  }

  return (
    <div>
      <Toolbar editor={editor} onLinkClick={handleAddLink} />
      <EditorContent editor={editor} />
    </div>
  );
}

function isEmptyDoc(json: unknown): boolean {
  if (typeof json !== 'object' || json === null) return true;
  const doc = json as { content?: unknown[] };
  if (!doc.content || doc.content.length === 0) return true;
  // doc with a single empty paragraph is also empty
  if (doc.content.length === 1) {
    const first = doc.content[0] as { type?: string; content?: unknown[] };
    if (first.type === 'paragraph' && (!first.content || first.content.length === 0)) {
      return true;
    }
  }
  return JSON.stringify(json) === JSON.stringify(emptyDoc());
}

interface ToolbarProps {
  editor: Editor;
  onLinkClick: () => void;
}

function Toolbar({ editor, onLinkClick }: ToolbarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-stone-900 border border-stone-700 rounded-t-xl"
      role="toolbar"
      aria-label="Textformatering"
    >
      <ToolbarButton
        label="Fet"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Kursiv"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Punktlista"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Nummerlista"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <Separator />
      <ToolbarButton
        label="Länk"
        active={editor.isActive('link')}
        onClick={onLinkClick}
      >
        <Link2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

interface ToolbarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ label, active, onClick, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-[#F24E1E]/20 text-[#F24E1E]'
          : 'text-stone-300 hover:bg-stone-800 hover:text-white'
      }`}
      style={active ? { color: ACCENT } : undefined}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span className="w-px h-5 bg-stone-700 mx-0.5" aria-hidden="true" />;
}
