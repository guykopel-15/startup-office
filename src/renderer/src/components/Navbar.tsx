import { DSButton } from '../designKit';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';
import { RepoStatusChip } from './RepoStatusChip';

import type React from 'react';

interface NavbarProps {
  onAddFigure: () => void;
  /** Opens the agent panel on a figure of the active floor. */
  onOpenFigure: (figureId: string) => void;
}

const APP_TITLE = 'Startup Office';
const ADD_FIGURE_LABEL = 'Add figure';
const ADD_FIGURE_HINT = 'Add an employee to a department on this floor';
const NO_FLOOR_HINT = 'Create a floor first';
const ADD_FIGURE_ICON = '+';
const AGENTS_LABEL = 'Agents';
const AGENTS_HINT = 'Open the agent panel for this floor';
const AGENTS_ICON = '▤';

export function Navbar({ onAddFigure, onOpenFigure }: NavbarProps): React.JSX.Element {
  const hasActiveFloor = useFloorsStore((state): boolean => state.activeFloorId !== null);
  const firstFigureId = useFloorsStore((state): string | null => selectActiveFigures(state)[0]?.id ?? null);
  const handleOpenAgents = (): void => {
    if (firstFigureId !== null) onOpenFigure(firstFigureId);
  };
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
        <DSButton onClick={handleOpenAgents} isDisabled={firstFigureId === null} title={AGENTS_HINT} icon={AGENTS_ICON}>
          {AGENTS_LABEL}
        </DSButton>
        <DSButton onClick={onAddFigure} isDisabled={!hasActiveFloor} title={hasActiveFloor ? ADD_FIGURE_HINT : NO_FLOOR_HINT} icon={ADD_FIGURE_ICON}>
          {ADD_FIGURE_LABEL}
        </DSButton>
      </div>
    </nav>
  );
}
