import type React from 'react';

interface DSProgressBarProps {
  /** 0..1 */
  fraction: number;
  label: string;
  isError?: boolean;
}

const PERCENT = 100;

/** A labelled bar; the label doubles as the accessible name. */
export function DSProgressBar({ fraction, label, isError = false }: DSProgressBarProps): React.JSX.Element {
  const percent = Math.round(Math.min(Math.max(fraction, 0), 1) * PERCENT);
  return (
    <div className={`ds-progress${isError ? ' ds-progress--error' : ''}`}>
      <div className="ds-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={percent} aria-label={label}>
        <div className="ds-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="ds-progress__label">
        <span>{label}</span>
        <span className="ds-progress__percent">{percent}%</span>
      </div>
    </div>
  );
}
