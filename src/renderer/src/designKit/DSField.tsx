import type React from 'react';

interface DSFieldProps {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  error?: string;
}

/** Label + control + optional error line, the one layout every form field uses. */
export function DSField({ label, htmlFor, children, error }: DSFieldProps): React.JSX.Element {
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error !== undefined && (
        <span className="ds-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
