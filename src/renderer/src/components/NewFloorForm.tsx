import { DSButton, DSField, DSInput } from '../designKit';

import type React from 'react';
import type { DSFieldControlProps } from '../designKit';
import type { NewFloorForm as NewFloorFormState } from './useNewFloor';

interface NewFloorFormProps {
  form: NewFloorFormState;
}

const NAME_LABEL = 'Floor name';
const NAME_FIELD_ID = 'floor-name';
const NAME_PLACEHOLDER = 'Defaults to the repository name';
const SOURCE_LABEL = 'Repository';
export const SOURCE_FIELD_ID = 'floor-source';
const SOURCE_PLACEHOLDER = 'https://github.com/owner/repo or /path/to/folder';
const BROWSE_LABEL = 'Browse…';
const HELP_TEXT = 'Each floor is one repository with its own team. Paste a GitHub URL to clone it, or point at a folder on this Mac.';
const ENTER_KEY = 'Enter';

/** The repository and name fields of the New floor dialog. State lives in `useNewFloor`. */
export function NewFloorForm({ form }: NewFloorFormProps): React.JSX.Element {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) form.submit();
  };
  return (
    <>
      <p className="dialog-help">{HELP_TEXT}</p>
      <DSField label={SOURCE_LABEL} htmlFor={SOURCE_FIELD_ID} error={form.sourceError}>
        {(control: DSFieldControlProps): React.ReactNode => (
          <div className="new-floor__source">
            <DSInput {...control} value={form.sourceText} onChange={form.setSourceText} onKeyDown={handleKeyDown} placeholder={SOURCE_PLACEHOLDER} />
            <DSButton onClick={form.pickFolder} isDisabled={form.isPickingFolder}>
              {BROWSE_LABEL}
            </DSButton>
          </div>
        )}
      </DSField>
      <DSField label={NAME_LABEL} htmlFor={NAME_FIELD_ID}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={form.name} onChange={form.setName} onKeyDown={handleKeyDown} placeholder={NAME_PLACEHOLDER} />}
      </DSField>
    </>
  );
}
