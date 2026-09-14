import { DSColorInput, DSField, DSInput, DSSelect, DSTextArea } from '../designKit';
import { ACCESSORY_OPTIONS, HAIR_STYLE_OPTIONS, JOB_MAX_LENGTH, NAME_MAX_LENGTH } from './addFigureForm';

import type React from 'react';
import type { Accessory, HairStyle, RoomKey } from '@shared/figures';
import type { DSFieldControlProps } from '../designKit';
import type { AddFigureForm } from './useAddFigureForm';

interface AddFigureFieldsProps {
  form: AddFigureForm;
}

type ColorKey = 'hairColor' | 'skinColor' | 'topColor' | 'pantsColor' | 'accessoryColor' | 'hatColor';

interface ColorField {
  key: ColorKey;
  label: string;
}

const NAME_PLACEHOLDER = 'Ella';
const JOB_PLACEHOLDER = 'Mobile dev';
const PROMPT_PLACEHOLDER = 'What this role owns. Leave empty for a default.';
const COLOR_FIELDS: readonly ColorField[] = [
  { key: 'hairColor', label: 'Hair' },
  { key: 'skinColor', label: 'Skin' },
  { key: 'topColor', label: 'Top' },
  { key: 'pantsColor', label: 'Pants' },
  { key: 'accessoryColor', label: 'Accessory' },
  { key: 'hatColor', label: 'Cap' },
];

/** The inputs of the Add figure form. All state lives in `useAddFigureForm`. */
export function AddFigureFields({ form }: AddFigureFieldsProps): React.JSX.Element {
  const { values, errors, roomOptions, setField, setLook } = form;
  return (
    <div className="add-figure__fields">
      <DSField label="Name" htmlFor="figure-name" error={errors.name}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={values.name} onChange={(value: string): void => setField('name', value)} placeholder={NAME_PLACEHOLDER} maxLength={NAME_MAX_LENGTH} />}
      </DSField>
      <DSField label="Job" htmlFor="figure-job" error={errors.job}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={values.job} onChange={(value: string): void => setField('job', value)} placeholder={JOB_PLACEHOLDER} maxLength={JOB_MAX_LENGTH} />}
      </DSField>
      <DSField label="Department" htmlFor="figure-room" error={errors.room}>
        {(control: DSFieldControlProps): React.ReactNode => <DSSelect {...control} value={values.room} options={roomOptions} onChange={(value: RoomKey): void => setField('room', value)} />}
      </DSField>
      <DSField label="Hair" htmlFor="figure-hair">
        {(control: DSFieldControlProps): React.ReactNode => <DSSelect {...control} value={values.look.hairStyle} options={HAIR_STYLE_OPTIONS} onChange={(value: HairStyle): void => setLook('hairStyle', value)} />}
      </DSField>
      <DSField label="Accessory" htmlFor="figure-accessory">
        {(control: DSFieldControlProps): React.ReactNode => <DSSelect {...control} value={values.look.accessory} options={ACCESSORY_OPTIONS} onChange={(value: Accessory): void => setLook('accessory', value)} />}
      </DSField>
      <div className="add-figure__colors">
        {COLOR_FIELDS.map(({ key, label }: ColorField): React.JSX.Element => (
          <DSColorInput key={key} id={`figure-${key}`} label={label} value={values.look[key]} onChange={(value: string): void => setLook(key, value)} />
        ))}
      </div>
      <DSField label="Role prompt" htmlFor="figure-prompt">
        {(control: DSFieldControlProps): React.ReactNode => <DSTextArea {...control} value={values.rolePrompt} onChange={(value: string): void => setField('rolePrompt', value)} placeholder={PROMPT_PLACEHOLDER} />}
      </DSField>
    </div>
  );
}
