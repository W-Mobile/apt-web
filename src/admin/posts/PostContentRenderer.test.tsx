import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PostContentRenderer } from './PostContentRenderer';
import { paragraphDoc, type TiptapDoc } from './postContent';

const mockGetUrl = vi.fn();

vi.mock('aws-amplify/storage', () => ({
  getUrl: (...args: unknown[]) => mockGetUrl(...args),
}));

function renderDoc(doc: TiptapDoc) {
  return render(<PostContentRenderer value={JSON.stringify(doc)} />);
}

describe('PostContentRenderer', () => {
  beforeEach(() => {
    mockGetUrl.mockReset();
  });

  describe('block nodes', () => {
    it('renders heading level 1 as <h1>', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Title' }],
          },
        ],
      });
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Title');
    });

    it('renders heading level 2 as <h2>', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Subtitle' }],
          },
        ],
      });
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
        'Subtitle',
      );
    });

    it('renders heading level 3 as <h3>', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'Section' }],
          },
        ],
      });
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Section',
      );
    });

    it('defaults unknown heading level to <h3>', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 7 },
            content: [{ type: 'text', text: 'Weird' }],
          },
        ],
      });
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
        'Weird',
      );
    });

    it('renders a paragraph as <p>', () => {
      const { container } = renderDoc(paragraphDoc('Hello'));
      const p = container.querySelector('p');
      expect(p).not.toBeNull();
      expect(p).toHaveTextContent('Hello');
    });

    it('renders a bullet list as <ul> with <li> children', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'A' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'B' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      const ul = container.querySelector('ul');
      expect(ul).not.toBeNull();
      const items = ul!.querySelectorAll('li');
      expect(items).toHaveLength(2);
      expect(items[0]).toHaveTextContent('A');
      expect(items[1]).toHaveTextContent('B');
    });

    it('renders an ordered list as <ol> with <li> children', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'First' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      const ol = container.querySelector('ol');
      expect(ol).not.toBeNull();
      expect(ol!.querySelector('li')).toHaveTextContent('First');
    });

    it('renders a block-level hardBreak as <br>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [{ type: 'hardBreak' }],
      });
      expect(container.querySelector('br')).not.toBeNull();
    });

    it('recurses into unknown block types with content', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'mysteryWrapper',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Inner' }],
              },
            ],
          },
        ],
      });
      expect(container.querySelector('p')).toHaveTextContent('Inner');
    });

    it('renders nothing for unknown leaf nodes', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [{ type: 'mysteryLeaf' }],
      });
      // Outer wrapper still exists but has no child elements
      expect(container.firstChild?.childNodes).toHaveLength(0);
    });

    it('renders nothing meaningful for an empty doc', () => {
      const { container } = renderDoc({ type: 'doc', content: [] });
      expect(container.firstChild?.childNodes).toHaveLength(0);
    });

    it('wraps legacy plain-text input in a paragraph', () => {
      const { container } = render(
        <PostContentRenderer value="Old post body" />,
      );
      const p = container.querySelector('p');
      expect(p).toHaveTextContent('Old post body');
    });
  });

  describe('inline marks', () => {
    it('wraps bold text in <strong>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
            ],
          },
        ],
      });
      expect(container.querySelector('strong')).toHaveTextContent('bold');
    });

    it('wraps italic text in <em>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
            ],
          },
        ],
      });
      expect(container.querySelector('em')).toHaveTextContent('italic');
    });

    it('wraps underline text in <u>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'underline' }], text: 'under' },
            ],
          },
        ],
      });
      expect(container.querySelector('u')).toHaveTextContent('under');
    });

    it('wraps code text in <code>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', marks: [{ type: 'code' }], text: 'code()' },
            ],
          },
        ],
      });
      expect(container.querySelector('code')).toHaveTextContent('code()');
    });

    it('renders link with href, target=_blank and rel=noopener noreferrer', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [
                  { type: 'link', attrs: { href: 'https://example.com' } },
                ],
                text: 'visit',
              },
            ],
          },
        ],
      });
      const link = screen.getByRole('link', { name: 'visit' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('falls back to "#" when a link has no href', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'link' }],
                text: 'no-href',
              },
            ],
          },
        ],
      });
      expect(screen.getByRole('link', { name: 'no-href' })).toHaveAttribute(
        'href',
        '#',
      );
    });

    it('nests multiple marks (bold + italic + link)', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [
                  { type: 'bold' },
                  { type: 'italic' },
                  { type: 'link', attrs: { href: 'https://example.com' } },
                ],
                text: 'mixed',
              },
            ],
          },
        ],
      });
      const link = screen.getByRole('link', { name: 'mixed' });
      // Order of nesting: marks applied in order — bold first, then italic, then link wraps all
      expect(link.querySelector('em')).not.toBeNull();
      expect(link.querySelector('em strong')).not.toBeNull();
    });

    it('ignores unknown marks but keeps the text', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                marks: [{ type: 'glow' }],
                text: 'plain',
              },
            ],
          },
        ],
      });
      expect(container.querySelector('p')).toHaveTextContent('plain');
    });

    it('renders inline hardBreak as <br>', () => {
      const { container } = renderDoc({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'before' },
              { type: 'hardBreak' },
              { type: 'text', text: 'after' },
            ],
          },
        ],
      });
      const p = container.querySelector('p');
      expect(p?.querySelector('br')).not.toBeNull();
      expect(p).toHaveTextContent('beforeafter');
    });
  });

  describe('S3Image', () => {
    it('uses an absolute http(s) URL directly without calling getUrl', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: {
              src: 'https://cdn.example.com/cat.jpg',
              alt: 'a cat',
            },
          },
        ],
      });
      const img = screen.getByRole('img', { name: 'a cat' });
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/cat.jpg');
      expect(mockGetUrl).not.toHaveBeenCalled();
    });

    it('uses a data: URL directly without calling getUrl', () => {
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'data:image/png;base64,AAAA', alt: 'inline' },
          },
        ],
      });
      const img = screen.getByRole('img', { name: 'inline' });
      expect(img).toHaveAttribute('src', 'data:image/png;base64,AAAA');
      expect(mockGetUrl).not.toHaveBeenCalled();
    });

    it('resolves S3 path via getUrl and renders the presigned URL', async () => {
      mockGetUrl.mockResolvedValue({
        url: new URL('https://signed.example.com/cat.jpg'),
      });
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'post_uploads/cat.jpg', alt: 'cat' },
          },
        ],
      });
      // Placeholder visible synchronously
      expect(screen.getByText('Laddar bild…')).toBeInTheDocument();
      await waitFor(() => {
        const img = screen.getByRole('img', { name: 'cat' });
        expect(img).toHaveAttribute(
          'src',
          'https://signed.example.com/cat.jpg',
        );
      });
      expect(mockGetUrl).toHaveBeenCalledWith({ path: 'post_uploads/cat.jpg' });
    });

    it('keeps showing the placeholder when getUrl rejects', async () => {
      mockGetUrl.mockRejectedValue(new Error('boom'));
      renderDoc({
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'post_uploads/broken.jpg', alt: 'broken' },
          },
        ],
      });
      // Wait for the rejected promise to settle
      await waitFor(() => {
        expect(mockGetUrl).toHaveBeenCalled();
      });
      expect(screen.getByText('Laddar bild…')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });
});
