import type React from 'react';
import type { DSFieldControlProps } from './DSField';

/** Field props are optional so a standalone input (the HUD chat) can carry its own aria-label. */
interface DSInputProps extends Partial<DSFieldControlProps> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** For inputs without a visible DSField label. */
  'aria-label'?: string;
}

export function DSInput({ id, value, onChange, placeholder, maxLength, onKeyDown, ...ariaProps }: DSInputProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => onChange(event.target.value);
  return <input id={id} className="ds-input" type="text" value={value} onChange={handleChange} placeholder={placeholder} maxLength={maxLength} onKeyDown={onKeyDown} autoComplete="off" {...ariaProps} />;
}
