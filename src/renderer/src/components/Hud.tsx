import { useMemo } from 'react';

import { MAX_TASK_LENGTH, TaskStatus } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { DSButton, DSButtonVariant, DSInput, submitOnEnter } from '../designKit';
import { selectActiveFigures, useFloorsStore } from '../store/floorsStore';
import { selectSprintForFloor, useSprintsStore } from '../store/sprintsStore';
import { countTasks, selectMessagesForFloor, selectTasksForFloor, useTasksStore } from '../store/tasksStore';
import { ChatLog } from './ChatLog';
import { SprintBoard } from './SprintBoard';
import { useHudChat } from './useHudChat';

import type React from 'react';
import type { Sprint } from '@shared/sprints';
import type { ChatMessage, Task } from '@shared/tasks';
import type { GiveTask } from './useGiveTask';
import type { Sprints } from './useSprints';

interface HudProps {
  giveTask: GiveTask;
  sprints: Sprints;
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
const HUD_LABEL = 'HUD';
const QUESTS_LABEL = 'Quests';
const CHAT_LABEL = 'Chat';
const CHAT_FIELD_ID = 'hud-chat';
const CHAT_PLACEHOLDER = 'Tell the team… (@Maya to pick who)';
const SEND_LABEL = 'Send';
const SEND_ICON = '➤';
const EXPAND_LABEL = 'Show chat history';
const COLLAPSE_LABEL = 'Hide chat history';
const EXPAND_ICON = '▲';
const COLLAPSE_ICON = '▼';

function QuestChips({ tasks }: { tasks: readonly Task[] }): React.JSX.Element {
  return (
    <div className="hud__quests" role="group" aria-label={QUESTS_LABEL}>
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
export function Hud({ giveTask, sprints }: HudProps): React.JSX.Element {
  const floorId = useFloorsStore((state): string | null => state.activeFloorId);
  const figures = useFloorsStore(selectActiveFigures);
  const allTasks = useTasksStore((state): readonly Task[] => state.tasks);
  const allMessages = useTasksStore((state): readonly ChatMessage[] => state.messages);
  // Select stable slices and derive here: a filtering selector would return a new array every render.
  const tasks = useMemo((): readonly Task[] => selectTasksForFloor({ tasks: allTasks }, floorId), [allTasks, floorId]);
  const messages = useMemo((): readonly ChatMessage[] => selectMessagesForFloor({ messages: allMessages }, floorId), [allMessages, floorId]);
  const allSprints = useSprintsStore((state): readonly Sprint[] => state.sprints);
  const sprint = useMemo((): Sprint | null => selectSprintForFloor({ sprints: allSprints }, floorId), [allSprints, floorId]);
  const chat = useHudChat(giveTask);

  return (
    <footer className="hud" aria-label={HUD_LABEL}>
      <div className="hud__top">
        <QuestChips tasks={tasks} />
        <DSButton onClick={chat.toggleExpanded} icon={chat.isExpanded ? COLLAPSE_ICON : EXPAND_ICON} title={chat.isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL} isExpanded={chat.isExpanded}>
          {chat.isExpanded ? COLLAPSE_LABEL : EXPAND_LABEL}
        </DSButton>
      </div>
      <SprintBoard sprint={sprint} tasks={tasks} figures={figures} canStart={giveTask.canGiveTasks} onStart={sprints.startSprint} />
      <ChatLog messages={messages} figures={figures} isExpanded={chat.isExpanded} />
      {chat.hint !== null && (
        <p className="hud__hint" role="status">
          {chat.hint}
        </p>
      )}
      <div className="hud__chat">
        <DSInput id={CHAT_FIELD_ID} value={chat.text} onChange={chat.setText} placeholder={CHAT_PLACEHOLDER} maxLength={MAX_TASK_LENGTH} onKeyDown={submitOnEnter(chat.send)} aria-label={CHAT_LABEL} />
        <DSButton onClick={chat.send} isDisabled={isBlank(chat.text)} variant={DSButtonVariant.Primary} icon={SEND_ICON}>
          {SEND_LABEL}
        </DSButton>
      </div>
    </footer>
  );
}
