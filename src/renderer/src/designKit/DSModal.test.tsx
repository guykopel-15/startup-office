import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { DSModal } from './DSModal';

describe('DSModal', () => {
  it('focuses the first field on open and keeps focus there while typing', async () => {
    const user = userEvent.setup();
    render(
      <DSModal title="Test" isOpen onClose={vi.fn()}>
        <input aria-label="Name" />
      </DSModal>,
    );
    const input = screen.getByLabelText('Name');
    expect(document.activeElement).toBe(input);
    await user.keyboard('abc');
    expect(document.activeElement).toBe(input);
  });

  it('closes on Escape and on a click that starts and ends on the backdrop', () => {
    const handleClose = vi.fn();
    render(
      <DSModal title="Test" isOpen onClose={handleClose}>
        <input aria-label="Name" />
      </DSModal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
    const backdrop = screen.getByRole('presentation');
    fireEvent.mouseDown(backdrop);
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('does not close when a drag starts inside the panel and ends on the backdrop', () => {
    const handleClose = vi.fn();
    render(
      <DSModal title="Test" isOpen onClose={handleClose}>
        <input aria-label="Name" />
      </DSModal>,
    );
    fireEvent.mouseDown(screen.getByLabelText('Name'));
    fireEvent.click(screen.getByRole('presentation'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the panel', async () => {
    const user = userEvent.setup();
    render(
      <DSModal title="Test" isOpen onClose={vi.fn()}>
        <input aria-label="Name" />
      </DSModal>,
    );
    await user.tab();
    expect(document.activeElement?.tagName).not.toBe('BODY');
    await user.tab();
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });
});
