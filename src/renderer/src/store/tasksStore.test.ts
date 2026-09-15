import { RunMode, RunStatus } from '@shared/agents';
import { CEO_AUTHOR_ID, TaskStatus } from '@shared/tasks';
import { REPLY_MAX_LENGTH, replyTextForRun, summarizeResult } from './replyText';
import { countTasks, selectMessagesForFloor, selectTasksForFloor, useTasksStore } from './tasksStore';

import type { AgentRun } from '@shared/agents';

const RUN: AgentRun = { id: 'run-1', floorId: 'f1', figureId: 'qa', prompt: 'p', mode: RunMode.ReadOnly, status: RunStatus.Done, lines: [], result: '# Report\n\n**All** good.', error: null, costUsd: null, turns: null, startedAt: '', endedAt: null };

afterEach((): void => {
  useTasksStore.setState({ tasks: [], messages: [] });
});

describe('tasksStore', () => {
  it('creates an active task, posts the ask, and closes it with the reply when the run ends', (): void => {
    const task = useTasksStore.getState().addTask({ floorId: 'f1', title: 'write tests', assigneeId: 'qa' });
    useTasksStore.getState().attachRun(task.id, 'run-1');
    expect(selectTasksForFloor(useTasksStore.getState(), 'f1')[0]?.status).toBe(TaskStatus.Active);
    expect(selectMessagesForFloor(useTasksStore.getState(), 'f1').map((message): string => message.authorId)).toEqual([CEO_AUTHOR_ID]);

    useTasksStore.getState().finishRun(RUN);
    const state = useTasksStore.getState();
    expect(countTasks(selectTasksForFloor(state, 'f1'), TaskStatus.Done)).toBe(1);
    expect(selectMessagesForFloor(state, 'f1')[1]).toMatchObject({ authorId: 'qa', text: 'Report\nAll good.' });
    expect(selectTasksForFloor(state, 'other')).toHaveLength(0);
  });

  it('marks failed and cancelled runs as failed tasks and ignores runs without a task', (): void => {
    const task = useTasksStore.getState().addTask({ floorId: 'f1', title: 'deploy', assigneeId: 'devops' });
    useTasksStore.getState().attachRun(task.id, 'run-1');
    useTasksStore.getState().finishRun({ ...RUN, status: RunStatus.Error, error: 'exit 1' });
    expect(useTasksStore.getState().tasks[0]?.status).toBe(TaskStatus.Failed);
    expect(useTasksStore.getState().messages[1]?.text).toBe('That one failed: exit 1');
    useTasksStore.getState().finishRun({ ...RUN, id: 'run-unknown' });
    expect(useTasksStore.getState().messages).toHaveLength(2);
  });

  it('clears a floor', (): void => {
    useTasksStore.getState().addTask({ floorId: 'f1', title: 'a', assigneeId: 'qa' });
    useTasksStore.getState().clearFloor('f1');
    expect(useTasksStore.getState().tasks).toHaveLength(0);
    expect(useTasksStore.getState().messages).toHaveLength(0);
  });
});

describe('replyText', () => {
  it('summarizes results and speaks for stopped, failed and empty runs', (): void => {
    expect(summarizeResult('a'.repeat(400))).toHaveLength(REPLY_MAX_LENGTH);
    expect(replyTextForRun({ ...RUN, status: RunStatus.Cancelled })).toBe('I stopped that one.');
    expect(replyTextForRun({ ...RUN, status: RunStatus.Error, error: null })).toBe('That one failed: something went wrong.');
    expect(replyTextForRun({ ...RUN, result: '  ' })).toBe('Done, but I have nothing to report.');
    expect(replyTextForRun({ ...RUN, status: RunStatus.Running })).toBe('');
  });
});
