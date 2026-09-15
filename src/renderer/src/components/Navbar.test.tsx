import { act, fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { FloorSourceKind } from '@shared/floors';
import { Navbar } from './Navbar';
import { useFloorsStore } from '../store/floorsStore';
import { useSettingsStore } from '../store/settingsStore';

import type React from 'react';

function renderNavbar(onAddFigure: () => void = vi.fn()): void {
  render(<Navbar onAddFigure={onAddFigure} onOpenFigure={vi.fn()} />);
}

describe('Navbar', () => {
  it('shows the app title', () => {
    renderNavbar();
    expect(screen.getByText('Startup Office')).toBeInTheDocument();
  });

  it('disables Add figure until a floor exists and shows the active floor in the chip', () => {
    useFloorsStore.setState({ floors: [], activeFloorId: null });
    const handleAddFigure = vi.fn();
    renderNavbar(handleAddFigure);
    expect(screen.getByRole('button', { name: 'Add figure' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('No floor');
    act((): void => {
      useFloorsStore.getState().createFloor({ name: 'Loop', source: { kind: FloorSourceKind.Local, path: '/tmp/loop' } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add figure' }));
    expect(handleAddFigure).toHaveBeenCalledTimes(1);
  });

  it('toggles the sound mute', () => {
    useSettingsStore.setState({ isMuted: false });
    renderNavbar();
    fireEvent.click(screen.getByRole('button', { name: 'Mute sounds' }));
    expect(useSettingsStore.getState().isMuted).toBe(true);
    expect(screen.getByRole('button', { name: 'Unmute sounds' })).toBeInTheDocument();
  });
});
