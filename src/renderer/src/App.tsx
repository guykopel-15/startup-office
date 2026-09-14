import React, { useState } from 'react';

import { AddFigureDialog } from './components/AddFigureDialog';
import { LoadRepoDialog } from './components/LoadRepoDialog';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './game/GameCanvas';

export function App(): React.JSX.Element {
  const [isAddFigureOpen, setIsAddFigureOpen] = useState(false);
  const [isLoadRepoOpen, setIsLoadRepoOpen] = useState(false);
  const handleOpenAddFigure = (): void => setIsAddFigureOpen(true);
  const handleCloseAddFigure = (): void => setIsAddFigureOpen(false);
  const handleOpenLoadRepo = (): void => setIsLoadRepoOpen(true);
  const handleCloseLoadRepo = (): void => setIsLoadRepoOpen(false);

  return (
    <div className="app">
      <Navbar onAddFigure={handleOpenAddFigure} onLoadRepo={handleOpenLoadRepo} />
      <GameCanvas />
      <AddFigureDialog isOpen={isAddFigureOpen} onClose={handleCloseAddFigure} />
      <LoadRepoDialog isOpen={isLoadRepoOpen} onClose={handleCloseLoadRepo} />
    </div>
  );
}
