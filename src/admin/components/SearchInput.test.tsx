import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={vi.fn()} placeholder="Sök övningar..." />);
    expect(screen.getByPlaceholderText('Sök övningar...')).toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const onChange = vi.fn();
    render(<SearchInput value="" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'squat');
    expect(onChange).toHaveBeenCalled();
  });
});
