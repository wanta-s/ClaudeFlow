import React from 'react';
import { Board as BoardType, Position } from '../types/game';
import Cell from './Cell';
import './Board.css';

interface BoardProps {
  board: BoardType;
  possibleMoves: Position[];
  lastMove: Position | null;
  onCellClick: (position: Position) => void;
}

const Board: React.FC<BoardProps> = ({ board, possibleMoves, lastMove, onCellClick }) => {
  const isPossibleMove = (row: number, col: number): boolean => {
    return possibleMoves.some(move => move.row === row && move.col === col);
  };

  const isLastMove = (row: number, col: number): boolean => {
    return lastMove !== null && lastMove.row === row && lastMove.col === col;
  };

  return (
    <div className="board">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="board-row">
          {row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              state={cell}
              isPossibleMove={isPossibleMove(rowIndex, colIndex)}
              isLastMove={isLastMove(rowIndex, colIndex)}
              onClick={() => onCellClick({ row: rowIndex, col: colIndex })}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default Board;