import { DSButton } from '../designKit';

import type React from 'react';

interface NavbarProps {
  onAddFigure: () => void;
}

const APP_TITLE = 'Startup Office';
const LOAD_REPO_LABEL = 'Load repo';
const ADD_FIGURE_LABEL = 'Add figure';
const LOAD_REPO_HINT = 'Arrives in task 6';
const ADD_FIGURE_HINT = 'Add an employee to a department';
const LOAD_REPO_ICON = '⇩';
const ADD_FIGURE_ICON = '+';

export function Navbar({ onAddFigure }: NavbarProps): React.JSX.Element {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">
          ▣
        </span>
        <span className="navbar__title">{APP_TITLE}</span>
      </div>
      <div className="navbar__actions">
        <DSButton isDisabled title={LOAD_REPO_HINT} icon={LOAD_REPO_ICON}>
          {LOAD_REPO_LABEL}
        </DSButton>
        <DSButton onClick={onAddFigure} title={ADD_FIGURE_HINT} icon={ADD_FIGURE_ICON}>
          {ADD_FIGURE_LABEL}
        </DSButton>
      </div>
    </nav>
  );
}
