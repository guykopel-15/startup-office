import type React from 'react';
import { Navbar } from './components/Navbar';
import { GameCanvas } from './game/GameCanvas';

export function App(): React.JSX.Element {
  return (
    <div className="app">
      <Navbar />
      <GameCanvas />
    </div>
  );
}
