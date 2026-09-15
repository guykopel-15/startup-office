import { useMemo } from 'react';

import { MAX_TASK_LENGTH, TaskStatus } from '@shared/tasks';
import { DSButton, DSButtonVariant, DSInput } from '../designKit';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';
import { countTasks, selectMessagesForFloor, selectTasksForFloor, useTasksStore } from '../store/tasksStore';
import { ChatLog } from './ChatLog';
import { useHudChat } from './useHudChat';

import type React from 'react';
import type { ChatMessage, Task } from '@shared/tasks';
import type { GiveTask } from './useGiveTask';

interface HudProps {
  giveTask: GiveTask;
}

interface QuestChip {
  status: TaskStatus;
  icon: string;
  label: string;
}

const QUEST_CHIPS: readonly QuestChip[] = [
  { status: TaskStatus.Active, icon: '⚔', label: 'active' },
  { status: TaskStatus.Done, icon: '✔', label: 'done' },
  { status: TaskStatus.Failed, icon: '✖', label: 'failed' },
];
const CHAT_FIELD_ID = 'hud-chat';
const CHAT_PLACEHOLDER = 'Tell the team… (@Maya to pick who)';
const SEND_LABEL = 'Send';
const SEND_ICON = '➤';
const EXPAND_LABEL = 'Show chat history';
const COLLAPSE_LABEL = 'Hide chat history';
const EXPAND_ICON = '▲';
const COLLAPSE_ICON = '▼';
const ENTER_KEY = 'Enter';

function QuestChips({ tasks }: { tasks: readonly Task[] }): React.JSX.Element {
  return (
    <div className="hud__quests" aria-label="Quests">
      {QUEST_CHIPS.map(
        (chip: QuestChip): React.JSX.Element => (
          <span key={chip.status} className={`hud__quest hud__quest--${chip.status}`} title={`${countTasks(tasks, chip.status)} ${chip.label}`}>
            <span aria-hidden="true">{chip.icon}</span> {countTasks(tasks, chip.status)} <span className="hud__quest-label">{chip.label}</span>
          </span>
        ),
      )}
    </div>
  );
}

/** Bottom bar: quest counts and the chat box that routes asks to figures. */
export function Hud({ giveTask }: HudProps): React.JSX.Element {
  const floorId = useFloorsStore((state): string | null => state.activeFloorId);
  const figures = useFloorsStore(selectActiveFigures);
  const allTasks = useTasksStore((state): readonly Task[] => state.tasks);
  const allMessages = useTasksStore((state): readonly ChatMessage[] => state.messages);
  // Select stable slices and derive here: a filtering selector would return a new array every render.
  const tasks = useMemo((): readonly Task[] => selectTasksForFloor({ tasks: allTasks }, floorId), [allTasks, floorId]);
  const messages = useMemo((): readonly ChatMessage[] => selectMessagesForFloor({ messages: allMessages }, floorId), [allMessages, floorId]);
  const chat = useHudChat(giveTask);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) chat.send();
  };

  return (
    <footer className="hud" aria-label="HUD">
      <div className="hud__top">
        <QuestChips tasks={tasks} />
        <DSButton onClick={chat.toggleExpanded} icon={chat.isExpanded ? COLLAPSE_ICON : EXPAND_ICON} title={chat.isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL}>
          {chat.isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL}
        </DSButton>
      </div>
      <ChatLog messages={messages} figures={figures} isExpanded={chat.isExpanded} />
      {chat.hint !== null && (
        <p className="hud__hint" role="status">
          {chat.hint}
        </p>
      )}
      <div className="hud__chat">
        <DSInput id={CHAT_FIELD_ID} value={chat.text} onChange={chat.setText} placeholder={CHAT_PLACEHOLDER} maxLength={MAX_TASK_LENGTH} onKeyDown={handleKeyDown} aria-label="Chat" />
        <DSButton onClick={chat.send} isDisabled={chat.text.trim() === ''} variant={DSButtonVariant.Primary} icon={SEND_ICON}>
          {SEND_LABEL}
        </DSButton>
      </div>
    </footer>
  );
}
