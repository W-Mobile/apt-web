import { describe, it, expect } from 'vitest';
import {
  parseContent,
  extractPlainText,
  emptyDoc,
  paragraphDoc,
  type TiptapDoc,
} from './postContent';

describe('parseContent', () => {
  it('parses valid stringified Tiptap JSON', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hello' }] },
      ],
    };
    expect(parseContent(JSON.stringify(doc))).toEqual(doc);
  });

  it('wraps plain-text input in a paragraph for backwards compatibility', () => {
    expect(parseContent('Old post body')).toEqual(
      paragraphDoc('Old post body'),
    );
  });

  it('returns empty doc for empty string', () => {
    expect(parseContent('')).toEqual(emptyDoc());
  });

  it('returns empty doc for whitespace-only string', () => {
    expect(parseContent('   ')).toEqual(emptyDoc());
  });

  it('falls back to plain-text paragraph when JSON is malformed', () => {
    expect(parseContent('{not valid json')).toEqual(
      paragraphDoc('{not valid json'),
    );
  });

  it('falls back to plain-text paragraph when JSON is not a doc node', () => {
    expect(parseContent('{"type":"paragraph"}')).toEqual(
      paragraphDoc('{"type":"paragraph"}'),
    );
  });
});

describe('extractPlainText', () => {
  it('extracts text from a single paragraph', () => {
    const json = JSON.stringify(paragraphDoc('Hello world'));
    expect(extractPlainText(json)).toBe('Hello world');
  });

  it('returns plain-text input unchanged (legacy posts)', () => {
    expect(extractPlainText('Old post body')).toBe('Old post body');
  });

  it('joins headings, paragraphs and list items with spaces', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Title' }],
        },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Intro ' },
            { type: 'text', text: 'text' },
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item A' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Item B' }],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(extractPlainText(JSON.stringify(doc))).toBe(
      'Title Intro text Item A Item B',
    );
  });

  it('skips non-text nodes like images', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Caption' }],
        },
        { type: 'image', attrs: { src: 'post_uploads/cat.jpg' } },
      ],
    };
    expect(extractPlainText(JSON.stringify(doc))).toBe('Caption');
  });

  it('truncates output to maxChars and appends an ellipsis', () => {
    const long = 'a'.repeat(200);
    const json = JSON.stringify(paragraphDoc(long));
    const result = extractPlainText(json, 50);
    expect(result.length).toBe(51); // 50 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('does not truncate when text fits within maxChars', () => {
    const json = JSON.stringify(paragraphDoc('short'));
    expect(extractPlainText(json, 50)).toBe('short');
  });

  it('returns empty string for empty content', () => {
    expect(extractPlainText('')).toBe('');
  });

  it('returns empty string for malformed JSON that contains nothing useful', () => {
    // Legacy "plain text" fallback returns the raw string; a JSON-looking
    // structure without text nodes returns ''.
    const doc: TiptapDoc = { type: 'doc', content: [] };
    expect(extractPlainText(JSON.stringify(doc))).toBe('');
  });
});

describe('emptyDoc', () => {
  it('returns a doc with no content', () => {
    expect(emptyDoc()).toEqual({ type: 'doc', content: [] });
  });
});

describe('paragraphDoc', () => {
  it('wraps text in a paragraph inside a doc', () => {
    expect(paragraphDoc('hi')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] },
      ],
    });
  });

  it('produces a doc with an empty paragraph for empty text', () => {
    expect(paragraphDoc('')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });
});
