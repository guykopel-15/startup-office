import { useEffect, useRef } from 'react';

import { MAX_TASK_LENGTH } from '@shared/tasks';
import { isBlank } from '@shared/text';
import { CLOSE_ICON, DSButton, DSButtonVariant, DSField, DSInput, ENTER_KEY, ESCAPE_KEY, submitOnEnter } from '../designKit';
import { FigurePreview } from './FigurePreview';
import { DialogMode } from './useDialogBox';
import { CANNOT_START_HINT } from './useGiveTask';
import { useTypewriter } from './useTypewriter';

import type React from 'react';
import type { DSFieldControlProps } from '../designKit';
import type { DialogBoxState } from './useDialogBox';

interface DialogBoxProps {
  dialog: DialogBoxState;
}

const TALK_TO_PREFIX = 'Talk to ';
const GIVE_TASK_LABEL = 'Give a task';
const SHOW_WORK_LABEL = 'Show your work';
const BYE_LABEL = 'Bye';
const CLOSE_LABEL = 'Close dialog';
const TASK_LABEL = 'What should I do?';
const TASK_PLACEHOLDER = 'e.g. Find the slowest query and explain it';
const SEND_LABEL = 'Send';
const BACK_LABEL = 'Back';
const TASK_FIELD_ID = 'dialog-task';

function Choices({ dialog }: DialogBoxProps): React.JSX.Element {
  return (
    <div className="dialog-box__choices">
      <DSButton onClick={dialog.openTask} isDisabled={!dialog.canGiveTasks} variant={DSButtonVariant.Primary} title={dialog.canGiveTasks ? undefined : CANNOT_START_HINT} shouldAutoFocus>
        {GIVE_TASK_LABEL}
      </DSButton>
      <DSButton onClick={dialog.showWork}>{SHOW_WORK_LABEL}</DSButton>
      <DSButton onClick={dialog.close}>{BYE_LABEL}</DSButton>
    </div>
  );
}

function TaskForm({ dialog }: DialogBoxProps): React.JSX.Element {
  return (
    <div className="dialog-box__task">
      <DSField label={TASK_LABEL} htmlFor={TASK_FIELD_ID}>
        {(control: DSFieldControlProps): React.ReactNode => (
          <DSInput {...control} value={dialog.text} onChange={dialog.setText} placeholder={TASK_PLACEHOLDER} maxLength={MAX_TASK_LENGTH} onKeyDown={submitOnEnter(dialog.submit)} shouldAutoFocus />
        )}
      </DSField>
      <div className="dialog-box__choices">
        <DSButton onClick={dialog.submit} isDisabled={isBlank(dialog.text)} variant={DSButtonVariant.Primary}>
          {SEND_LABEL}
        </DSButton>
        <DSButton onClick={dialog.backToTalk}>{BACK_LABEL}</DSButton>
      </div>
    </div>
  );
}

/** Gives focus back to whatever had it before the box opened (the game canvas, usually). */
function useRestoreFocus(isOpen: boolean): void {
  const previousRef = useRef<Element | null>(null);
  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;
    previousRef.current = document.activeElement;
    return (): void => {
      const previous = previousRef.current;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [isOpen]);
}

/** MapleStory-style NPC dialog: portrait, name, typed greeting and choices. Escape closes, a click reveals the whole line. */
export function DialogBox({ dialog }: DialogBoxProps): React.JSX.Element | null {
  const typewriter = useTypewriter(dialog.greeting);
  useRestoreFocus(dialog.isOpen);
  if (!dialog.isOpen || dialog.figure === null) return null;
  const { figure } = dialog;
  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === ESCAPE_KEY) dialog.close();
    if (event.key === ENTER_KEY && !typewriter.isDone) typewriter.skip();
  };
  return (
    // A click anywhere on the box (not a control) reveals the whole line, like tapping through NPC text.
    <section className="dialog-box" role="dialog" aria-label={`${TALK_TO_PREFIX}${figure.name}`} onKeyDown={handleKeyDown} onClick={typewriter.skip}>
      <div className="dialog-box__portrait">
        <FigurePreview look={figure.look} />
      </div>
      <div className="dialog-box__body">
        <header className="dialog-box__header">
          <span className="dialog-box__name">{figure.name}</span>
          <span className="dialog-box__job">{figure.job}</span>
        </header>
        <p className="dialog-box__text">{typewriter.shown}</p>
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
