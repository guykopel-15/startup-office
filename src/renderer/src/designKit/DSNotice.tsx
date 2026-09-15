import { useState } from 'react';

import { DSButton } from './DSButton';
import { CLOSE_ICON } from './DSModal';

import type React from 'react';

interface DSNoticeProps {
  /** The notice disappears when this becomes null and can be dismissed by the reader. */
  message: string | null;
}

const DISMISS_LABEL = 'Dismiss notice';

/** A one-line warning strip with a dismiss button, for things worth telling the player once. */
export function DSNotice({ message }: DSNoticeProps): React.JSX.Element | null {
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (message === null || message === dismissed) return null;
  const handleDismiss = (): void => setDismissed(message);
  return (
    <div className="ds-notice" role="status">
      <span className="ds-notice__text">{message}</span>
      <DSButton onClick={handleDismiss} icon={CLOSE_ICON} title={DISMISS_LABEL}>
        {DISMISS_LABEL}
      </DSButton>
    </div>
  );
}
