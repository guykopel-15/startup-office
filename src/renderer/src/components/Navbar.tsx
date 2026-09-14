import { DSButton } from '../designKit';
import { useFloorsStore } from '../store/floorsStore';
import { RepoStatusChip } from './RepoStatusChip';

import type React from 'react';

interface NavbarProps {
  onAddFigure: () => void;
}

const APP_TITLE = 'Startup Office';
const ADD_FIGURE_LABEL = 'Add figure';
const ADD_FIGURE_HINT = 'Add an employee to a department on this floor';
const NO_FLOOR_HINT = 'Create a floor first';
const ADD_FIGURE_ICON = '+';

export function Navbar({ onAddFigure }: NavbarProps): React.JSX.Element {
  const hasActiveFloor = useFloorsStore((state): boolean => state.activeFloorId !== null);
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">
          ▣
        </span>
        <span className="navbar__title">{APP_TITLE}</span>
      </div>
      <div className="navbar__actions">
        <RepoStatusChip />
        <DSButton onClick={onAddFigure} isDisabled={!hasActiveFloor} title={hasActiveFloor ? ADD_FIGURE_HINT : NO_FLOOR_HINT} icon={ADD_FIGURE_ICON}>
          {ADD_FIGURE_LABEL}
        </DSButton>
      </div>
    </nav>
  );
}
