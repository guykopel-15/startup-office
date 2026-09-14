import type React from 'react';

interface DSColorInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** A labelled color swatch; the value is always `#rrggbb`. */
export function DSColorInput({ id, label, value, onChange }: DSColorInputProps): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => onChange(event.target.value);
  return (
    <label className="ds-color" htmlFor={id}>
      <input id={id} className="ds-color__input" type="color" value={value} onChange={handleChange} />
      <span className="ds-color__label">{label}</span>
    </label>
  );
}
