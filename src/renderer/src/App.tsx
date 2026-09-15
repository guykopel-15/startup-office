import React, { useState } from 'react';

import { useAgentEventsSubscription, useClaudeAvailability } from './api/agentQueries';
import { useRepoStatusSubscription } from './api/repoQueries';
import { AddFigureDialog } from './components/AddFigureDialog';
import { AgentPanel } from './components/AgentPanel';
import { FloorsPanel } from './components/FloorsPanel';
import { Navbar } from './components/Navbar';
import { NewFloorDialog } from './components/NewFloorDialog';
import { OfficeEmptyState } from './components/OfficeEmptyState';
import { useAgentPanel } from './components/useAgentPanel';
import { useAutoIntake } from './components/useAutoIntake';
import { GameCanvas } from './game/GameCanvas';
import { useFloorsStore } from './store/floorsStore';

export function App(): React.JSX.Element {
  useRepoStatusSubscription();
  useAgentEventsSubscription();
  const availability = useClaudeAvailability();
  const isClaudeAvailable = availability.data?.isAvailable === true;
  useAutoIntake(isClaudeAvailable);
  const panel = useAgentPanel(isClaudeAvailable);
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
          <GameCanvas />
          {!hasFloors && <OfficeEmptyState onNewFloor={handleOpenNewFloor} />}
          <AgentPanel panel={panel} availability={availability.data} />
        </main>
      </div>
      <AddFigureDialog isOpen={isAddFigureOpen} onClose={handleCloseAddFigure} />
      <NewFloorDialog isOpen={isNewFloorOpen} onClose={handleCloseNewFloor} />
    </div>
  );
}
