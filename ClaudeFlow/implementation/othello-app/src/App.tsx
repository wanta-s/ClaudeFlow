import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import GameInfo from './components/GameInfo';
import { GameState, Position } from './types/game';
import { createInitialGameState, makeMove } from './services/gameLogic';
import './App.css';

function App() {
  const [gameState, setGameState] = useState<GameState>(createInitialGameState());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('othello-game-state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setGameState(parsed);
      } catch (error) {
        console.error('Failed to load saved game state:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (!isSaving) return;
    
    const timer = setTimeout(() => {
      localStorage.setItem('othello-game-state', JSON.stringify(gameState));
      setIsSaving(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [gameState, isSaving]);

  const handleCellClick = (position: Position) => {
    if (gameState.isGameOver) return;
    
    const newState = makeMove(gameState, position);
    if (newState !== gameState) {
      setGameState(newState);
      setIsSaving(true);
    }
  };

  const handleNewGame = () => {
    const newState = createInitialGameState();
    setGameState(newState);
    setIsSaving(true);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>オセロゲーム</h1>
      </header>
      <main className="app-main">
        <div className="game-container">
          <Board
            board={gameState.board}
            possibleMoves={gameState.possibleMoves}
            lastMove={gameState.lastMove}
            onCellClick={handleCellClick}
          />
          <GameInfo
            gameState={gameState}
            onNewGame={handleNewGame}
          />
        </div>
      </main>
    </div>
  );
}

export default App;