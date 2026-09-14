import { DSButton, DSButtonVariant } from '../designKit';

import type React from 'react';

interface OfficeEmptyStateProps {
  onNewFloor: () => void;
}

const TITLE = 'The office is empty';
const BODY = 'Add a floor to bring in a repository and its team.';
const ACTION_LABEL = 'New floor';

/** Overlay on the office when there are no floors yet. */
export function OfficeEmptyState({ onNewFloor }: OfficeEmptyStateProps): React.JSX.Element {
  return (
    <div className="office-empty" role="note">
      <div className="office-empty__card">
        <h2 className="office-empty__title">{TITLE}</h2>
        <p className="office-empty__body">{BODY}</p>
        <DSButton onClick={onNewFloor} variant={DSButtonVariant.Primary}>
          {ACTION_LABEL}
        </DSButton>
      </div>
    </div>
  );
}
