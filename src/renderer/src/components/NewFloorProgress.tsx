import { FloorSetupStep } from '@shared/floors';
import { DSProgressBar } from '../designKit';

import type React from 'react';
import type { Figure } from '@shared/figures';
import type { Floor } from '@shared/floors';

interface NewFloorProgressProps {
  floor: Floor;
}

const TEAM_LABEL = 'Team so far';
const SEPARATOR = ' · ';

/** Progress bar plus the figures hired so far. */
export function NewFloorProgress({ floor }: NewFloorProgressProps): React.JSX.Element {
  const isError = floor.setup.step === FloorSetupStep.Error;
  return (
    <div className="new-floor__progress">
      <DSProgressBar fraction={floor.setup.fraction} label={floor.setup.label} isError={isError} />
      <ul className="new-floor__team" aria-label={TEAM_LABEL}>
        {floor.figures.map((figure: Figure): React.JSX.Element => (
          <li key={figure.id}>
            {figure.name}
            {SEPARATOR}
            {figure.job}
          </li>
        ))}
      </ul>
    </div>
  );
}
