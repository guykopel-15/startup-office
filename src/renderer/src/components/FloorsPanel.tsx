import { FloorSetupStep } from '@shared/floors';
import { RepoState } from '@shared/repo';
import { CLOSE_ICON, DSButton } from '../designKit';
import { useFloorsStore } from '../store/floorsStore';
import { useRunsStore } from '../store/runsStore';
import { useTasksStore } from '../store/tasksStore';

import type React from 'react';
import type { Floor } from '@shared/floors';

interface FloorsPanelProps {
  onNewFloor: () => void;
}

const PANEL_TITLE = 'Floors';
const NEW_FLOOR_LABEL = 'New floor';
const NEW_FLOOR_ICON = '+';
const CLOSE_LABEL = 'Close floor';
const EMPTY_HINT = 'No floors yet';
const AVATAR_LENGTH = 1;

enum TabState {
  Busy = 'busy',
  Ready = 'ready',
  Error = 'error',
}

/** One dot color per tab: yellow while setting up or cloning, green when ready, red on failure. */
export function tabState(floor: Floor): TabState {
  if (floor.setup.step === FloorSetupStep.Error || floor.repoStatus.state === RepoState.Error) return TabState.Error;
  if (floor.setup.step === FloorSetupStep.Ready && floor.repoStatus.state === RepoState.Ready) return TabState.Ready;
  return TabState.Busy;
}

function FloorTab({ floor, isActive }: { floor: Floor; isActive: boolean }): React.JSX.Element {
  const setActiveFloor = useFloorsStore((state): typeof state.setActiveFloor => state.setActiveFloor);
  const removeFloor = useFloorsStore((state): typeof state.removeFloor => state.removeFloor);
  const state = tabState(floor);
  const title = `${floor.name} · ${floor.repoStatus.fullName ?? floor.setup.label}`;
  const handleSelect = (): void => setActiveFloor(floor.id);
  const handleRemove = (): void => {
    removeFloor(floor.id);
    useRunsStore.getState().clearFloor(floor.id);
    useTasksStore.getState().clearFloor(floor.id);
  };
  return (
    <div className={`floor-tab floor-tab--${state}${isActive ? ' floor-tab--active' : ''}`} title={title}>
      <button type="button" className="floor-tab__select" onClick={handleSelect} aria-pressed={isActive} aria-label={title}>
        <span className="floor-tab__avatar" aria-hidden="true">
          {floor.name.slice(0, AVATAR_LENGTH).toUpperCase()}
        </span>
        <span className="floor-tab__name">{floor.name}</span>
        <span className="floor-tab__dot" aria-hidden="true" />
      </button>
      <span className="floor-tab__close">
        <DSButton onClick={handleRemove} icon={CLOSE_ICON} title={CLOSE_LABEL}>
          {CLOSE_LABEL}
        </DSButton>
      </span>
    </div>
  );
}

/** Left rail with one tab per floor, like workspaces in a terminal multiplexer. */
export function FloorsPanel({ onNewFloor }: FloorsPanelProps): React.JSX.Element {
  const floors = useFloorsStore((state): Floor[] => state.floors);
  const activeFloorId = useFloorsStore((state): string | null => state.activeFloorId);
  return (
    <aside className="floors-panel" aria-label={PANEL_TITLE}>
      <div className="floors-panel__header">
        <span className="floors-panel__title">{PANEL_TITLE}</span>
        <DSButton onClick={onNewFloor} icon={NEW_FLOOR_ICON} title={NEW_FLOOR_LABEL}>
          {NEW_FLOOR_LABEL}
        </DSButton>
      </div>
      <div className="floors-panel__tabs" role="tablist">
        {floors.length === 0 && <p className="floors-panel__empty">{EMPTY_HINT}</p>}
        {floors.map((floor: Floor): React.JSX.Element => (
          <FloorTab key={floor.id} floor={floor} isActive={floor.id === activeFloorId} />
        ))}
      </div>
    </aside>
  );
}
