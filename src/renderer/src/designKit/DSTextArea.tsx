import type React from 'react';

interface DSTextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const DEFAULT_ROWS = 3;

export function DSTextArea({ id, value, onChange, placeholder, rows = DEFAULT_ROWS }: DSTextAreaProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => onChange(event.target.value);
  return <textarea id={id} className="ds-input ds-textarea" value={value} onChange={handleChange} placeholder={placeholder} rows={rows} />;
}
