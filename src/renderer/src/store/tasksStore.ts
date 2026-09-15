import { create } from 'zustand';

import { RunStatus } from '@shared/agents';
import { CEO_AUTHOR_ID, TaskStatus } from '@shared/tasks';
import { replyTextForRun } from './replyText';

import type { StoreApi } from 'zustand';

import type { AgentRun } from '@shared/agents';
import type { ChatMessage, Task } from '@shared/tasks';

export interface NewTaskInput {
  floorId: string;
  title: string;
  assigneeId: string;
}

export interface NewMessageInput {
  floorId: string;
  authorId: string;
  text: string;
}

export interface TasksState {
  /** Oldest first. */
  tasks: Task[];
  /** Oldest first. */
  messages: ChatMessage[];
  /** Creates an active task, posts the CEO's ask to the chat and returns the task. */
  addTask: (input: NewTaskInput) => Task;
  attachRun: (taskId: string, runId: string) => void;
  addMessage: (input: NewMessageInput) => ChatMessage;
  /** Marks the task of a finished run done or failed and posts the figure's reply. */
  finishRun: (run: AgentRun) => void;
  /** Fails a task that never got a run and posts `reason` as the assignee's reply. */
  failTask: (taskId: string, reason: string) => void;
  clearFloor: (floorId: string) => void;
}

const TASK_ID_PREFIX = 'task-';
const MESSAGE_ID_PREFIX = 'message-';
/** Keep memory bounded per floor; the chat shows the tail anyway. */
export const MAX_MESSAGES = 200;
const EMPTY_TASKS: readonly Task[] = [];
const EMPTY_MESSAGES: readonly ChatMessage[] = [];

const TASK_STATUS_BY_RUN_STATUS: Readonly<Partial<Record<RunStatus, TaskStatus>>> = {
  [RunStatus.Done]: TaskStatus.Done,
  [RunStatus.Error]: TaskStatus.Failed,
  [RunStatus.Cancelled]: TaskStatus.Failed,
};

function nextId(prefix: string): string {
  return `${prefix}${crypto.randomUUID()}`;
}

function patchTask(tasks: readonly Task[], match: (task: Task) => boolean, patch: (task: Task) => Task): Task[] {
  return tasks.map((task: Task): Task => (match(task) ? patch(task) : task));
}

function buildMessage(input: NewMessageInput): ChatMessage {
  return { id: nextId(MESSAGE_ID_PREFIX), floorId: input.floorId, authorId: input.authorId, text: input.text, createdAt: new Date().toISOString() };
}

export function selectTasksForFloor(state: { tasks: readonly Task[] }, floorId: string | null): readonly Task[] {
  const tasks = state.tasks.filter((task: Task): boolean => task.floorId === floorId);
  return tasks.length === 0 ? EMPTY_TASKS : tasks;
}

export function selectMessagesForFloor(state: { messages: readonly ChatMessage[] }, floorId: string | null): readonly ChatMessage[] {
  const messages = state.messages.filter((message: ChatMessage): boolean => message.floorId === floorId);
  return messages.length === 0 ? EMPTY_MESSAGES : messages;
}

export function countTasks(tasks: readonly Task[], status: TaskStatus): number {
  return tasks.filter((task: Task): boolean => task.status === status).length;
}

export const useTasksStore = create<TasksState>((set: StoreApi<TasksState>['setState'], get: StoreApi<TasksState>['getState']): TasksState => ({
  tasks: [],
  messages: [],
  addTask: (input: NewTaskInput): Task => {
    const task: Task = { id: nextId(TASK_ID_PREFIX), floorId: input.floorId, title: input.title, assigneeId: input.assigneeId, status: TaskStatus.Active, runId: null, createdAt: new Date().toISOString() };
    set({ tasks: [...get().tasks, task] });
    get().addMessage({ floorId: input.floorId, authorId: CEO_AUTHOR_ID, text: input.title });
    return task;
  },
  attachRun: (taskId: string, runId: string): void => {
    set({ tasks: patchTask(get().tasks, (task: Task): boolean => task.id === taskId, (task: Task): Task => ({ ...task, runId })) });
  },
  addMessage: (input: NewMessageInput): ChatMessage => {
    const message = buildMessage(input);
    set({ messages: [...get().messages, message].slice(-MAX_MESSAGES) });
    return message;
  },
  finishRun: (run: AgentRun): void => {
    const status = TASK_STATUS_BY_RUN_STATUS[run.status];
    const task = get().tasks.find((candidate: Task): boolean => candidate.runId === run.id);
    if (status === undefined || task === undefined) return;
    set({ tasks: patchTask(get().tasks, (candidate: Task): boolean => candidate.id === task.id, (candidate: Task): Task => ({ ...candidate, status })) });
    get().addMessage({ floorId: run.floorId, authorId: run.figureId, text: replyTextForRun(run) });
  },
  failTask: (taskId: string, reason: string): void => {
    const task = get().tasks.find((candidate: Task): boolean => candidate.id === taskId);
    if (task === undefined) return;
    set({ tasks: patchTask(get().tasks, (candidate: Task): boolean => candidate.id === taskId, (candidate: Task): Task => ({ ...candidate, status: TaskStatus.Failed })) });
    get().addMessage({ floorId: task.floorId, authorId: task.assigneeId, text: reason });
  },
  clearFloor: (floorId: string): void => {
    set({ tasks: get().tasks.filter((task: Task): boolean => task.floorId !== floorId), messages: get().messages.filter((message: ChatMessage): boolean => message.floorId !== floorId) });
  },
}));
