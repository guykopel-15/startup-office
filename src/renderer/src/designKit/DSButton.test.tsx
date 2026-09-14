import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import { DSButton } from './DSButton';

describe('DSButton', () => {
  it('calls onClick when enabled', () => {
    const handleClick = vi.fn();
    render(<DSButton onClick={handleClick}>Go</DSButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <DSButton onClick={handleClick} isDisabled>
        Go
      </DSButton>,
    );
    const button = screen.getByRole('button', { name: 'Go' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
