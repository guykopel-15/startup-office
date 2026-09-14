import { useMemo, useState } from 'react';

import { getFurniture } from '../game/world/furniture';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';
import { buildRoomOptions, defaultRolePrompt, emptyForm, validateAddFigureForm } from './addFigureForm';

import type { Figure, FigureLook, RoomKey } from '@shared/figures';
import type { DSSelectOption } from '../designKit';
import type { AddFigureFormErrors, AddFigureFormValues } from './addFigureForm';
import type { FloorsState } from '../store/floorsStore';

const ROOM_FULL_ERROR = 'That department filled up. Pick another.';

export interface AddFigureForm {
  values: AddFigureFormValues;
  errors: AddFigureFormErrors;
  roomOptions: DSSelectOption<RoomKey>[];
  setField: <Key extends keyof AddFigureFormValues>(key: Key, value: AddFigureFormValues[Key]) => void;
  setLook: <Key extends keyof FigureLook>(key: Key, value: FigureLook[Key]) => void;
  reset: () => void;
  /** Validates and adds through the store. Returns true when the figure was seated. */
  submit: () => boolean;
}

/** Form state, validation and submit for the Add figure dialog; the store does the seating. */
export function useAddFigureForm(): AddFigureForm {
  const figures = useFloorsStore((state: FloorsState): readonly Figure[] => selectActiveFigures(state));
  const addFigure = useFloorsStore((state: FloorsState): FloorsState['addFigure'] => state.addFigure);
  const furniture = useMemo(getFurniture, []);
  const [values, setValues] = useState<AddFigureFormValues>((): AddFigureFormValues => emptyForm(figures, furniture));
  const [errors, setErrors] = useState<AddFigureFormErrors>({});
  const roomOptions = useMemo((): DSSelectOption<RoomKey>[] => buildRoomOptions(figures, furniture), [figures, furniture]);

  const setField = <Key extends keyof AddFigureFormValues>(key: Key, value: AddFigureFormValues[Key]): void => setValues((current: AddFigureFormValues): AddFigureFormValues => ({ ...current, [key]: value }));
  const setLook = <Key extends keyof FigureLook>(key: Key, value: FigureLook[Key]): void => setValues((current: AddFigureFormValues): AddFigureFormValues => ({ ...current, look: { ...current.look, [key]: value } }));

  const reset = (): void => {
    setValues(emptyForm(selectActiveFigures(useFloorsStore.getState()), furniture));
    setErrors({});
  };

  const submit = (): boolean => {
    const nextErrors = validateAddFigureForm(values, figures, furniture);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return false;
    const rolePrompt = values.rolePrompt.trim() === '' ? defaultRolePrompt(values.job) : values.rolePrompt;
    const added = addFigure({ ...values, rolePrompt });
    if (added === null) {
      setErrors({ room: ROOM_FULL_ERROR });
      return false;
    }
    reset();
    return true;
  };

  return { values, errors, roomOptions, setField, setLook, reset, submit };
}
