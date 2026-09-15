import { DSButton, DSButtonVariant, DSField, DSInput } from '../designKit';
import { MAX_TASK_LENGTH } from '@shared/tasks';
import { FigurePreview } from './FigurePreview';
import { DialogMode } from './useDialogBox';
import { useTypewriter } from './useTypewriter';

import type React from 'react';
import type { DSFieldControlProps } from '../designKit';
import type { DialogBoxState } from './useDialogBox';

interface DialogBoxProps {
  dialog: DialogBoxState;
}

const GIVE_TASK_LABEL = 'Give a task';
const NO_REPO_HINT = 'Needs Claude Code and a repository on this floor';
const SHOW_WORK_LABEL = 'Show your work';
const BYE_LABEL = 'Bye';
const CLOSE_LABEL = 'Close dialog';
const CLOSE_ICON = '×';
const TASK_LABEL = 'What should I do?';
const TASK_PLACEHOLDER = 'e.g. Find the slowest query and explain it';
const SEND_LABEL = 'Send';
const BACK_LABEL = 'Back';
const TASK_FIELD_ID = 'dialog-task';
const ENTER_KEY = 'Enter';

function Choices({ dialog }: DialogBoxProps): React.JSX.Element {
  return (
    <div className="dialog-box__choices">
      <DSButton onClick={dialog.openTask} isDisabled={!dialog.canGiveTasks} variant={DSButtonVariant.Primary} title={dialog.canGiveTasks ? undefined : NO_REPO_HINT}>
        {GIVE_TASK_LABEL}
      </DSButton>
      <DSButton onClick={dialog.showWork}>{SHOW_WORK_LABEL}</DSButton>
      <DSButton onClick={dialog.close}>{BYE_LABEL}</DSButton>
    </div>
  );
}

function TaskForm({ dialog }: DialogBoxProps): React.JSX.Element {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ENTER_KEY) dialog.submit();
  };
  return (
    <div className="dialog-box__task">
      <DSField label={TASK_LABEL} htmlFor={TASK_FIELD_ID}>
        {(control: DSFieldControlProps): React.ReactNode => <DSInput {...control} value={dialog.text} onChange={dialog.setText} placeholder={TASK_PLACEHOLDER} maxLength={MAX_TASK_LENGTH} onKeyDown={handleKeyDown} />}
      </DSField>
      <div className="dialog-box__choices">
        <DSButton onClick={dialog.submit} isDisabled={dialog.text.trim() === ''} variant={DSButtonVariant.Primary}>
          {SEND_LABEL}
        </DSButton>
        <DSButton onClick={dialog.backToTalk}>{BACK_LABEL}</DSButton>
      </div>
    </div>
  );
}

/** MapleStory-style NPC dialog: portrait, name, typed greeting and choices. */
export function DialogBox({ dialog }: DialogBoxProps): React.JSX.Element | null {
  const typed = useTypewriter(dialog.greeting);
  if (!dialog.isOpen || dialog.figure === null) return null;
  const { figure } = dialog;
  return (
    <section className="dialog-box" role="dialog" aria-label={`Talk to ${figure.name}`}>
      <div className="dialog-box__portrait">
        <FigurePreview look={figure.look} />
      </div>
      <div className="dialog-box__body">
        <header className="dialog-box__header">
          <span className="dialog-box__name">{figure.name}</span>
          <span className="dialog-box__job">{figure.job}</span>
        </header>
        <p className="dialog-box__text">{typed}</p>
        {dialog.mode === DialogMode.Talk ? <Choices dialog={dialog} /> : <TaskForm dialog={dialog} />}
      </div>
      <div className="dialog-box__close">
        <DSButton onClick={dialog.close} icon={CLOSE_ICON} title={CLOSE_LABEL}>
          {CLOSE_LABEL}
        </DSButton>
      </div>
    </section>
  );
}
