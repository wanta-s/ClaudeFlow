import React from 'react';
import { GameState } from '../types/game';
import './GameInfo.css';

interface GameInfoProps {
  gameState: GameState;
  onNewGame: () => void;
}

const GameInfo: React.FC<GameInfoProps> = ({ gameState, onNewGame }) => {
  const { currentPlayer, blackCount, whiteCount, isGameOver, winner } = gameState;

  return (
    <div className="game-info">
      <div className="score-board">
        <div className={`score ${currentPlayer === 'black' && !isGameOver ? 'active' : ''}`}>
          <span className="player-indicator black"></span>
          <span className="score-value">{blackCount}</span>
        </div>
        <div className={`score ${currentPlayer === 'white' && !isGameOver ? 'active' : ''}`}>
          <span className="player-indicator white"></span>
          <span className="score-value">{whiteCount}</span>
        </div>
      </div>

      {!isGameOver && (
        <div className="current-turn">
          <span className={`turn-indicator ${currentPlayer}`}></span>
          {currentPlayer === 'black' ? '黒' : '白'}の番
        </div>
      )}

      {isGameOver && (
        <div className="game-over">
          <h2>ゲーム終了！</h2>
          <p className="winner">
            {winner === 'draw' ? '引き分け' : `${winner === 'black' ? '黒' : '白'}の勝利！`}
          </p>
        </div>
      )}

      <button className="new-game-button" onClick={onNewGame}>
        新しいゲーム
      </button>
    </div>
  );
};

export default GameInfo;