import { SprintStatus } from '@shared/sprints';
import { TaskStatus } from '@shared/tasks';
import { isSprintFinished, selectSprintForFloor, sprintProgress, useSprintsStore } from './sprintsStore';

import type { Task } from '@shared/tasks';

function task(id: string, status: TaskStatus): Task {
  return { id, floorId: 'f1', title: id, assigneeId: 'qa', status, runId: null, createdAt: '' };
}

afterEach((): void => {
  useSprintsStore.setState({ sprints: [] });
});

describe('sprintsStore', (): void => {
  it('runs a sprint from planning through active to closed and reports progress', (): void => {
    const sprint = useSprintsStore.getState().startSprint({ floorId: 'f1', goal: '  Ship it ' });
    expect(sprint).toMatchObject({ goal: 'Ship it', status: SprintStatus.Planning, taskIds: [] });
    useSprintsStore.getState().attachPlanRun(sprint.id, 'run-plan');
    useSprintsStore.getState().applyPlan(sprint.id, ['t1', 't2']);
    const active = selectSprintForFloor(useSprintsStore.getState(), 'f1');
    expect(active).toMatchObject({ planRunId: 'run-plan', status: SprintStatus.Active, taskIds: ['t1', 't2'] });
    if (active === null) throw new Error('no sprint');

    const tasks = [task('t1', TaskStatus.Done), task('t2', TaskStatus.Active)];
    expect(sprintProgress(active, tasks)).toEqual({ total: 2, done: 1, failed: 0, fraction: 0.5 });
    expect(isSprintFinished(active, tasks)).toBe(false);
    const ended = [task('t1', TaskStatus.Done), task('t2', TaskStatus.Failed)];
    expect(isSprintFinished(active, ended)).toBe(true);

    useSprintsStore.getState().closeSprint(active.id);
    expect(selectSprintForFloor(useSprintsStore.getState(), 'f1')?.status).toBe(SprintStatus.Closed);
    expect(selectSprintForFloor(useSprintsStore.getState(), 'other')).toBeNull();
  });

  it('clears a floor', (): void => {
    useSprintsStore.getState().startSprint({ floorId: 'f1', goal: 'a' });
    useSprintsStore.getState().clearFloor('f1');
    expect(useSprintsStore.getState().sprints).toHaveLength(0);
  });
});
