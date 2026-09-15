import React, { useState } from 'react';

import { useAgentEventsSubscription, useClaudeAvailability } from './api/agentQueries';
import { useRepoStatusSubscription } from './api/repoQueries';
import { useHydration, usePersistence } from './api/stateQueries';
import { AddFigureDialog } from './components/AddFigureDialog';
import { AgentPanel } from './components/AgentPanel';
import { DialogBox } from './components/DialogBox';
import { FloorsPanel } from './components/FloorsPanel';
import { Hud } from './components/Hud';
import { Navbar } from './components/Navbar';
import { NewFloorDialog } from './components/NewFloorDialog';
import { OfficeEmptyState } from './components/OfficeEmptyState';
import { useAgentPanel } from './components/useAgentPanel';
import { useAutoIntake } from './components/useAutoIntake';
import { useDialogBox } from './components/useDialogBox';
import { useGiveTask } from './components/useGiveTask';
import { useSprints } from './components/useSprints';
import { DSNotice } from './designKit';
import { GameCanvas } from './game/GameCanvas';
import { useFloorsStore } from './store/floorsStore';

export function App(): React.JSX.Element {
  useRepoStatusSubscription();
  useAgentEventsSubscription();
  const availability = useClaudeAvailability();
  const isClaudeAvailable = availability.data?.isAvailable === true;
  const hydration = useHydration();
  usePersistence(hydration.isHydrated);
  // Intake waits for the saved office: a restored floor already read its repo.
  useAutoIntake(isClaudeAvailable && hydration.isHydrated);
  const panel = useAgentPanel(isClaudeAvailable);
  const giveTask = useGiveTask(isClaudeAvailable);
  const dialog = useDialogBox(giveTask, { onShowWork: panel.selectFigure, onOpen: panel.close });
  const sprints = useSprints(giveTask, isClaudeAvailable);
  const hasFloors = useFloorsStore((state): boolean => state.floors.length > 0);
  const [isAddFigureOpen, setIsAddFigureOpen] = useState(false);
  const [isNewFloorOpen, setIsNewFloorOpen] = useState(false);
  const handleOpenAddFigure = (): void => setIsAddFigureOpen(true);
  const handleCloseAddFigure = (): void => setIsAddFigureOpen(false);
  const handleOpenNewFloor = (): void => setIsNewFloorOpen(true);
  const handleCloseNewFloor = (): void => setIsNewFloorOpen(false);

  return (
    <div className="app">
      <Navbar onAddFigure={handleOpenAddFigure} onOpenFigure={panel.selectFigure} />
      <div className="app__body">
        <FloorsPanel onNewFloor={handleOpenNewFloor} />
        <main className="app__main">
          <div className="app__stage">
            <GameCanvas />
            <DSNotice message={hydration.warning} />
            {!hasFloors && <OfficeEmptyState onNewFloor={handleOpenNewFloor} />}
            <DialogBox dialog={dialog} />
            <AgentPanel panel={panel} availability={availability.data} />
          </div>
          {hasFloors && <Hud giveTask={giveTask} sprints={sprints} />}
        </main>
      </div>
      <AddFigureDialog isOpen={isAddFigureOpen} onClose={handleCloseAddFigure} />
      <NewFloorDialog isOpen={isNewFloorOpen} onClose={handleCloseNewFloor} />
    </div>
  );
}
