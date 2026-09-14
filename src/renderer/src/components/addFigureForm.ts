import { Accessory, HairStyle, RoomKey } from '@shared/figures';
import { ROOMS } from '../game/world/floorPlan';
import { countFreeDesks } from '../store/figuresStore';

import type { Figure, FigureLook } from '@shared/figures';
import type { DSSelectOption } from '../designKit';
import type { Room } from '../game/world/floorPlan';
import type { Furniture } from '../game/world/furniture';
import type { NewFigureInput } from '../store/figuresStore';

export interface AddFigureFormValues extends NewFigureInput {}

export interface AddFigureFormErrors {
  name?: string;
  job?: string;
  room?: string;
}

export const NAME_MAX_LENGTH = 24;
export const JOB_MAX_LENGTH = 32;
const NAME_REQUIRED = 'Give the figure a name';
const JOB_REQUIRED = 'Give the figure a job';
const ROOM_FULL = 'No free desk in this department';
const SEATS_LEFT_ONE = '1 seat left';
const NO_SEATS = 'full';

export const DEFAULT_LOOK: FigureLook = {
  hairStyle: HairStyle.Short,
  hairColor: '#5a3a22',
  skinColor: '#f5c9a2',
  topColor: '#7b5cff',
  pantsColor: '#26305a',
  accessory: Accessory.None,
  accessoryColor: '#1a1330',
  hatColor: '#3a7bd5',
};

export const EMPTY_FORM: AddFigureFormValues = {
  name: '',
  job: '',
  room: RoomKey.ResearchAndDevelopment,
  look: DEFAULT_LOOK,
  rolePrompt: '',
};

export const HAIR_STYLE_OPTIONS: readonly DSSelectOption<HairStyle>[] = [
  { value: HairStyle.Short, label: 'Short' },
  { value: HairStyle.Long, label: 'Long' },
  { value: HairStyle.Spiky, label: 'Spiky' },
  { value: HairStyle.Bun, label: 'Bun' },
  { value: HairStyle.Cap, label: 'Cap' },
];

export const ACCESSORY_OPTIONS: readonly DSSelectOption<Accessory>[] = [
  { value: Accessory.None, label: 'None' },
  { value: Accessory.Glasses, label: 'Glasses' },
  { value: Accessory.Headphones, label: 'Headphones' },
  { value: Accessory.Tie, label: 'Tie' },
  { value: Accessory.Beard, label: 'Beard' },
];

function seatsLabel(freeDesks: number): string {
  if (freeDesks === 0) return NO_SEATS;
  if (freeDesks === 1) return SEATS_LEFT_ONE;
  return `${freeDesks} seats left`;
}

/** Departments that can seat people, with how many desks are still free. */
export function buildRoomOptions(figures: readonly Figure[], furniture: readonly Furniture[]): DSSelectOption<RoomKey>[] {
  return ROOMS.filter((room: Room): boolean => !room.isCorridor && room.key !== RoomKey.MeetingRoom).map((room: Room): DSSelectOption<RoomKey> => {
    const freeDesks = countFreeDesks(room.key, figures, furniture);
    return { value: room.key, label: `${room.name} (${seatsLabel(freeDesks)})`, isDisabled: freeDesks === 0 };
  });
}

/** Pure validation; an empty object means the form can be submitted. */
export function validateAddFigureForm(values: AddFigureFormValues, figures: readonly Figure[], furniture: readonly Furniture[]): AddFigureFormErrors {
  const errors: AddFigureFormErrors = {};
  if (values.name.trim() === '') errors.name = NAME_REQUIRED;
  if (values.job.trim() === '') errors.job = JOB_REQUIRED;
  if (countFreeDesks(values.room, figures, furniture) === 0) errors.room = ROOM_FULL;
  return errors;
}

/** A role prompt the agent runner can use when the user leaves the field empty. */
export function defaultRolePrompt(job: string): string {
  return `You are the ${job.trim().toLowerCase()}. Work on what this role owns in the repo.`;
}
