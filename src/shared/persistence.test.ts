import { DEFAULT_FIGURES, FigureState } from './figures';
import { FloorSetupStep, FloorSourceKind } from './floors';
import { SNAPSHOT_VERSION, parseSnapshot, settleSnapshot } from './persistence';
import { RepoState } from './repo';
import { SprintStatus } from './sprints';
import { TaskStatus } from './tasks';

import type { Figure } from './figures';
import type { Floor } from './floors';
import type { Snapshot } from './persistence';

const FLOOR: Floor = {
  id: 'f1',
  name: 'Loop',
  source: { kind: FloorSourceKind.Local, path: '/tmp/loop' },
  repoStatus: { state: RepoState.Ready, url: null, fullName: 'loop', path: '/tmp/loop', message: null },
  figures: [{ ...(DEFAULT_FIGURES[0] as Figure), state: FigureState.Working }],
  setup: { step: FloorSetupStep.Ready, fraction: 1, label: 'Floor ready', error: null },
};

const SNAPSHOT: Snapshot = {
  version: SNAPSHOT_VERSION,
  savedAt: '2026-09-15T10:00:00.000Z',
  floors: [FLOOR],
  activeFloorId: 'f1',
  tasks: [
    { id: 't1', floorId: 'f1', title: 'a', assigneeId: 'frontend', status: TaskStatus.Active, runId: 'r1', createdAt: '' },
    { id: 't2', floorId: 'f1', title: 'b', assigneeId: 'frontend', status: TaskStatus.Done, runId: 'r2', createdAt: '' },
  ],
  messages: [{ id: 'm1', floorId: 'f1', authorId: 'ceo', text: 'hi', createdAt: '' }],
  sprints: [{ id: 's1', floorId: 'f1', goal: 'g', status: SprintStatus.Planning, planRunId: 'r0', taskIds: [], createdAt: '', closedAt: null }],
  intakeStartedFloorIds: ['f1'],
  settings: { isMuted: true },
};

describe('persistence', (): void => {
  it('accepts a well-formed snapshot and rejects the wrong version or shape', (): void => {
    expect(parseSnapshot(JSON.parse(JSON.stringify(SNAPSHOT)))).toEqual(SNAPSHOT);
    expect(parseSnapshot({ ...SNAPSHOT, version: 99 })).toBeNull();
    expect(parseSnapshot({ ...SNAPSHOT, floors: [{ id: 'x' }] })).toBeNull();
    expect(parseSnapshot({ ...SNAPSHOT, settings: {} })).toBeNull();
    expect(parseSnapshot({ ...SNAPSHOT, intakeStartedFloorIds: [1] })).toBeNull();
    expect(parseSnapshot('nope')).toBeNull();
  });

  it('settles a snapshot for a fresh start: idle figures, failed open quests, closed sprints, the rest untouched', (): void => {
    const settled = settleSnapshot(SNAPSHOT);
    expect(settled.floors[0]?.figures[0]?.state).toBe(FigureState.Idle);
    expect(settled.tasks.map((task): TaskStatus => task.status)).toEqual([TaskStatus.Failed, TaskStatus.Done]);
    expect(settled.sprints[0]).toMatchObject({ status: SprintStatus.Closed });
    expect(settled.sprints[0]?.closedAt).not.toBeNull();
    expect(settled.messages).toEqual(SNAPSHOT.messages);
    expect(settled.settings).toEqual({ isMuted: true });
  });
});
