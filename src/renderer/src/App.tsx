import React, { useState } from 'react';

import { AddFigureDialog } from './components/AddFigureDialog';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './game/GameCanvas';

export function App(): React.JSX.Element {
  const [isAddFigureOpen, setIsAddFigureOpen] = useState(false);
  const handleOpenAddFigure = (): void => setIsAddFigureOpen(true);
  const handleCloseAddFigure = (): void => setIsAddFigureOpen(false);

  return (
    <div className="app">
      <Navbar onAddFigure={handleOpenAddFigure} />
      <GameCanvas />
      <AddFigureDialog isOpen={isAddFigureOpen} onClose={handleCloseAddFigure} />
    </div>
  );
}
