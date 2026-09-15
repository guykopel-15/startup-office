import React, { useState } from 'react';

import { useRepoStatusSubscription } from './api/repoQueries';
import { AddFigureDialog } from './components/AddFigureDialog';
import { FloorsPanel } from './components/FloorsPanel';
import { Navbar } from './components/Navbar';
import { NewFloorDialog } from './components/NewFloorDialog';
import { OfficeEmptyState } from './components/OfficeEmptyState';
import { GameCanvas } from './game/GameCanvas';
import { useFloorsStore } from './store/floorsStore';

export function App(): React.JSX.Element {
  useRepoStatusSubscription();
  const hasFloors = useFloorsStore((state): boolean => state.floors.length > 0);
  const [isAddFigureOpen, setIsAddFigureOpen] = useState(false);
  const [isNewFloorOpen, setIsNewFloorOpen] = useState(false);
  const handleOpenAddFigure = (): void => setIsAddFigureOpen(true);
  const handleCloseAddFigure = (): void => setIsAddFigureOpen(false);
  const handleOpenNewFloor = (): void => setIsNewFloorOpen(true);
  const handleCloseNewFloor = (): void => setIsNewFloorOpen(false);

  return (
    <div className="app">
      <Navbar onAddFigure={handleOpenAddFigure} />
      <div className="app__body">
        <FloorsPanel onNewFloor={handleOpenNewFloor} />
        <main className="app__main">
          <GameCanvas />
          {!hasFloors && <OfficeEmptyState onNewFloor={handleOpenNewFloor} />}
        </main>
      </div>
      <AddFigureDialog isOpen={isAddFigureOpen} onClose={handleCloseAddFigure} />
      <NewFloorDialog isOpen={isNewFloorOpen} onClose={handleCloseNewFloor} />
    </div>
  );
}
