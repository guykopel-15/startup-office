import type React from 'react';
export function Navbar(): React.JSX.Element {
  return (
    <nav className="navbar" aria-label="Main">
      <div className="navbar__brand">
        <span className="navbar__logo" aria-hidden="true">
          ▣
        </span>
        <span className="navbar__title">Startup Office</span>
      </div>
      <div className="navbar__actions">
        <button type="button" className="btn" disabled title="Task 5">
          Load repo
        </button>
        <button type="button" className="btn" disabled title="Task 4">
          + Figure
        </button>
      </div>
    </nav>
  );
}
