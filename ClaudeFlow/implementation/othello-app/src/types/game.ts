export type Player = 'black' | 'white';
export type CellState = Player | null;
export type Board = CellState[][];

export interface Position {
  row: number;
  col: number;
}

export interface GameState {
  board: Board;
  currentPlayer: Player;
  blackCount: number;
  whiteCount: number;
  isGameOver: boolean;
  winner: Player | 'draw' | null;
  possibleMoves: Position[];
  lastMove: Position | null;
}

export interface GameHistory {
  id: string;
  date: Date;
  winner: Player | 'draw';
  blackCount: number;
  whiteCount: number;
  moves: Position[];
}