import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('does not render when not open', () => {
    render(<ConfirmDialog open={false} title="Ta bort?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByText('Ta bort?')).not.toBeInTheDocument();
  });

  it('renders title and calls onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open={true} title="Ta bort?" message="Är du säker?" onConfirm={onConfirm} onCancel={vi.fn()} />);
    expect(screen.getByText('Ta bort?')).toBeInTheDocument();
    expect(screen.getByText('Är du säker?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ja/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancelled', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open={true} title="Ta bort?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /avbryt/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
