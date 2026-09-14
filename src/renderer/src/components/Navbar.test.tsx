import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('shows the app title', () => {
    render(<Navbar onAddFigure={vi.fn()} />);
    expect(screen.getByText('Startup Office')).toBeInTheDocument();
  });

  it('keeps Load repo disabled until its task lands and opens Add figure on click', () => {
    const handleAddFigure = vi.fn();
    render(<Navbar onAddFigure={handleAddFigure} />);
    expect(screen.getByRole('button', { name: 'Load repo' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add figure' }));
    expect(handleAddFigure).toHaveBeenCalledTimes(1);
  });
});
