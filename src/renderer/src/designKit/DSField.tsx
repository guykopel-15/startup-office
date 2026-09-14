import React from 'react';

/** What a DSField hands to its control so assistive tech links the error to it. */
export interface DSFieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface DSFieldProps {
  label: string;
  htmlFor: string;
  /** Receives the control props (id + aria links) and renders the control. */
  children: (controlProps: DSFieldControlProps) => React.ReactNode;
  error?: string;
}

const ERROR_ID_SUFFIX = '-error';

/** Label + control + optional error line, the one layout every form field uses. */
export function DSField({ label, htmlFor, children, error }: DSFieldProps): React.JSX.Element {
  const errorId = `${htmlFor}${ERROR_ID_SUFFIX}`;
  const hasError = error !== undefined;
  return (
    <div className="ds-field">
      <label className="ds-field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children({ id: htmlFor, 'aria-invalid': hasError, 'aria-describedby': hasError ? errorId : undefined })}
      {hasError && (
        <span className="ds-field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
