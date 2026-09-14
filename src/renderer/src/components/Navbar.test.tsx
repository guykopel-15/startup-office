import { render, screen } from '@testing-library/react';
import { Navbar } from './Navbar';

describe('Navbar', () => {
  it('shows the app title', () => {
    render(<Navbar />);
    expect(screen.getByText('Startup Office')).toBeInTheDocument();
  });

  it('has the repo and add-figure buttons disabled until their tasks land', () => {
    render(<Navbar />);
    expect(screen.getByRole('button', { name: 'Load repo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ Figure' })).toBeDisabled();
  });
});
