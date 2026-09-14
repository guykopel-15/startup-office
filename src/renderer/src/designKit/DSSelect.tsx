import type React from 'react';
import type { DSFieldControlProps } from './DSField';

export interface DSSelectOption<Value extends string> {
  value: Value;
  label: string;
  isDisabled?: boolean;
}

interface DSSelectProps<Value extends string> extends DSFieldControlProps {
  value: Value;
  options: readonly DSSelectOption<Value>[];
  onChange: (value: Value) => void;
}

export function DSSelect<Value extends string>({ id, value, options, onChange, ...ariaProps }: DSSelectProps<Value>): React.JSX.Element {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => onChange(event.target.value as Value);
  return (
    <select id={id} className="ds-input ds-select" value={value} onChange={handleChange} {...ariaProps}>
      {options.map((option: DSSelectOption<Value>): React.JSX.Element => (
        <option key={option.value} value={option.value} disabled={option.isDisabled === true}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
