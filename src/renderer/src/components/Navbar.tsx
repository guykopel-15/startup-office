import { DSButton } from '../designKit';

import type React from 'react';

const APP_TITLE = 'Startup Office';
const LOAD_REPO_LABEL = 'Load repo';
const ADD_FIGURE_LABEL = '+ Figure';
const LOAD_REPO_HINT = 'Arrives in task 5';
const ADD_FIGURE_HINT = 'Arrives in task 4';

export function Navbar(): React.JSX.Element {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">
          ▣
        </span>
        <span className="navbar__title">{APP_TITLE}</span>
      </div>
      <div className="navbar__actions">
        <DSButton isDisabled title={LOAD_REPO_HINT}>
          {LOAD_REPO_LABEL}
        </DSButton>
        <DSButton isDisabled title={ADD_FIGURE_HINT}>
          {ADD_FIGURE_LABEL}
        </DSButton>
      </div>
    </nav>
  );
}
