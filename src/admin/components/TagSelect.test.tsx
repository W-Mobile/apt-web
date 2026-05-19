import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagSelect } from './TagSelect';

describe('TagSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('visar valda taggar som chips i Title Case', () => {
    render(<TagSelect value={['legs', 'upper body']} onChange={vi.fn()} suggestions={[]} />);
    expect(screen.getByText('Legs')).toBeInTheDocument();
    expect(screen.getByText('Upper Body')).toBeInTheDocument();
  });

  it('tar bort en tagg när dess kryss klickas', async () => {
    const onChange = vi.fn();
    render(<TagSelect value={['legs', 'core']} onChange={onChange} suggestions={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /ta bort legs/i }));
    expect(onChange).toHaveBeenCalledWith(['core']);
  });

  it('lägger till en befintlig tagg från dropdownen (normaliserad)', async () => {
    const onChange = vi.fn();
    render(<TagSelect value={[]} onChange={onChange} suggestions={['core']} />);
    await userEvent.click(screen.getByPlaceholderText(/sök eller skapa/i));
    await userEvent.click(screen.getByRole('button', { name: 'Core' }));
    expect(onChange).toHaveBeenCalledWith(['core']);
  });

  it('exkluderar redan valda taggar ur dropdownen', async () => {
    render(<TagSelect value={['legs']} onChange={vi.fn()} suggestions={['legs', 'core']} />);
    await userEvent.click(screen.getByPlaceholderText(/sök eller skapa/i));
    expect(screen.queryByRole('button', { name: 'Legs' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Core' })).toBeInTheDocument();
  });

  it('skapar en ny tagg när query inte matchar något (normaliserad)', async () => {
    const onChange = vi.fn();
    render(<TagSelect value={[]} onChange={onChange} suggestions={['core']} />);
    await userEvent.type(screen.getByPlaceholderText(/sök eller skapa/i), 'Mobility');
    await userEvent.click(screen.getByRole('button', { name: /skapa "mobility"/i }));
    expect(onChange).toHaveBeenCalledWith(['mobility']);
  });

  it('visar inte "skapa"-raden när query matchar en befintlig tagg', async () => {
    render(<TagSelect value={[]} onChange={vi.fn()} suggestions={['core']} />);
    await userEvent.type(screen.getByPlaceholderText(/sök eller skapa/i), 'core');
    expect(screen.queryByRole('button', { name: /skapa "/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Core' })).toBeInTheDocument();
  });

  it('döljer input och visar maxgräns när maxTags är nått', () => {
    render(
      <TagSelect
        value={['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']}
        onChange={vi.fn()}
        suggestions={[]}
        maxTags={10}
      />
    );
    expect(screen.queryByPlaceholderText(/sök eller skapa/i)).not.toBeInTheDocument();
    expect(screen.getByText(/max 10 taggar/i)).toBeInTheDocument();
  });

  it('lägger till via Enter-tangenten', async () => {
    const onChange = vi.fn();
    render(<TagSelect value={[]} onChange={onChange} suggestions={[]} />);
    const input = screen.getByPlaceholderText(/sök eller skapa/i);
    await userEvent.type(input, 'Mobility{Enter}');
    expect(onChange).toHaveBeenCalledWith(['mobility']);
  });
});
