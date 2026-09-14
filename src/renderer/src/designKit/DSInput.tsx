import type React from 'react';

interface DSInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function DSInput({ id, value, onChange, placeholder, maxLength }: DSInputProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => onChange(event.target.value);
  return <input id={id} className="ds-input" type="text" value={value} onChange={handleChange} placeholder={placeholder} maxLength={maxLength} autoComplete="off" />;
}
