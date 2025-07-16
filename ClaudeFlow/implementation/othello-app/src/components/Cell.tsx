import React from 'react';
import { CellState } from '../types/game';
import './Cell.css';

interface CellProps {
  state: CellState;
  isPossibleMove: boolean;
  isLastMove: boolean;
  onClick: () => void;
}

const Cell: React.FC<CellProps> = ({ state, isPossibleMove, isLastMove, onClick }) => {
  const classNames = [
    'cell',
    state ? `cell-${state}` : '',
    isPossibleMove ? 'cell-possible' : '',
    isLastMove ? 'cell-last-move' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {state && <div className="disc" />}
      {isPossibleMove && <div className="possible-move-indicator" />}
    </div>
  );
};

export default Cell;