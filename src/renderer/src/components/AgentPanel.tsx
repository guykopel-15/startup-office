import { CLOSE_ICON, DSButton, DSButtonVariant, DSField, DSSelect, DSTextArea } from '../designKit';
import { RunOutput } from './RunOutput';

import type React from 'react';
import type { ClaudeAvailability } from '@shared/agents';
import type { Figure } from '@shared/figures';
import type { DSFieldControlProps, DSSelectOption } from '../designKit';
import type { AgentPanelState } from './useAgentPanel';

interface AgentPanelProps {
  panel: AgentPanelState;
  availability: ClaudeAvailability | undefined;
}

const CLOSE_LABEL = 'Close panel';
const FIGURE_LABEL = 'Figure';
const ROLE_LABEL = 'Role prompt';
const TASK_LABEL = 'Ask or assign';
const TASK_PLACEHOLDER = 'What should this figure look into?';
const INTAKE_LABEL = 'Read the repo';
const RUN_LABEL = 'Run';
const STOP_LABEL = 'Stop';
const NO_REPO_HINT = 'The floor has no repository on disk yet.';
const CHECKING_HINT = 'Checking for Claude Code…';
const SEPARATOR = ' · ';

function figureOptions(figures: readonly Figure[]): DSSelectOption<string>[] {
  return figures.map((figure: Figure): DSSelectOption<string> => ({ value: figure.id, label: `${figure.name}${SEPARATOR}${figure.job}` }));
}

/** Right-hand drawer for one figure: role prompt, run controls and the live output of its claude session. */
export function AgentPanel({ panel, availability }: AgentPanelProps): React.JSX.Element | null {
  if (!panel.isOpen || panel.figure === null) return null;
  const { figure } = panel;
  const availabilityHint = availability === undefined ? CHECKING_HINT : availability.error;
  const hint = availabilityHint ?? (panel.floor?.repoStatus.path === null ? NO_REPO_HINT : null);
  return (
    <aside className="agent-panel" aria-label={`${figure.name} agent`}>
      <header className="agent-panel__header">
        <DSField label={FIGURE_LABEL} htmlFor="agent-figure">
          {(control: DSFieldControlProps): React.ReactNode => <DSSelect {...control} value={figure.id} options={figureOptions(panel.figures)} onChange={panel.selectFigure} />}
        </DSField>
        <DSButton onClick={panel.close} icon={CLOSE_ICON} title={CLOSE_LABEL}>
          {CLOSE_LABEL}
        </DSButton>
      </header>
      {hint !== null && (
        <p className="agent-panel__hint" role="status">
          {hint}
        </p>
      )}
      <div className="agent-panel__body">
        <DSField label={ROLE_LABEL} htmlFor="agent-role">
          {(control: DSFieldControlProps): React.ReactNode => <DSTextArea {...control} value={figure.rolePrompt} onChange={panel.setRolePrompt} rows={2} />}
        </DSField>
        <DSField label={TASK_LABEL} htmlFor="agent-task">
          {(control: DSFieldControlProps): React.ReactNode => <DSTextArea {...control} value={panel.task} onChange={panel.setTask} placeholder={TASK_PLACEHOLDER} rows={2} />}
        </DSField>
        <div className="agent-panel__actions">
          <DSButton onClick={panel.runIntake} isDisabled={!panel.canRun}>
            {INTAKE_LABEL}
          </DSButton>
          <DSButton onClick={panel.runTask} isDisabled={!panel.canRun || panel.task.trim() === ''} variant={DSButtonVariant.Primary}>
            {RUN_LABEL}
          </DSButton>
          {panel.isBusy && <DSButton onClick={panel.stop}>{STOP_LABEL}</DSButton>}
        </div>
        <RunOutput run={panel.latestRun} history={panel.runs} />
      </div>
    </aside>
  );
}
