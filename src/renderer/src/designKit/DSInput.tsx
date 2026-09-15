import type React from 'react';
import type { DSFieldControlProps } from './DSField';

interface DSInputOwnProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  shouldAutoFocus?: boolean;
}

/** An input outside a DSField carries its own accessible name. */
interface DSStandaloneInputProps {
  id: string;
  'aria-label': string;
  'aria-invalid'?: undefined;
  'aria-describedby'?: undefined;
}

/** Inside a DSField the field supplies the id and aria links; a standalone input must carry its own aria-label. */
type DSInputProps = DSInputOwnProps & (DSFieldControlProps | DSStandaloneInputProps);

export function DSInput({ value, onChange, placeholder, maxLength, onKeyDown, shouldAutoFocus = false, ...inputProps }: DSInputProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => onChange(event.target.value);
  return <input className="ds-input" type="text" value={value} onChange={handleChange} placeholder={placeholder} maxLength={maxLength} onKeyDown={onKeyDown} autoFocus={shouldAutoFocus} autoComplete="off" {...inputProps} />;
}
