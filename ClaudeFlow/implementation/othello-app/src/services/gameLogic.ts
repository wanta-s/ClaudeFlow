import { Board, CellState, GameState, Player, Position } from '../types/game';

const BOARD_SIZE = 8;
const DIRECTIONS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1]
];

export function initializeBoard(): Board {
  const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  return board;
}

export function createInitialGameState(): GameState {
  const board = initializeBoard();
  return {
    board,
    currentPlayer: 'black',
    blackCount: 2,
    whiteCount: 2,
    isGameOver: false,
    winner: null,
    possibleMoves: getPossibleMoves(board, 'black'),
    lastMove: null
  };
}

function isValidPosition(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOpponent(player: Player): Player {
  return player === 'black' ? 'white' : 'black';
}

export function isValidMove(board: Board, player: Player, position: Position): boolean {
  const { row, col } = position;
  
  if (!isValidPosition(row, col) || board[row][col] !== null) {
    return false;
  }

  const opponent = getOpponent(player);

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    let hasOpponentBetween = false;

    while (isValidPosition(r, c) && board[r][c] === opponent) {
      hasOpponentBetween = true;
      r += dr;
      c += dc;
    }

    if (hasOpponentBetween && isValidPosition(r, c) && board[r][c] === player) {
      return true;
    }
  }

  return false;
}

export function getPossibleMoves(board: Board, player: Player): Position[] {
  const moves: Position[] = [];

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isValidMove(board, player, { row, col })) {
        moves.push({ row, col });
      }
    }
  }

  return moves;
}

function flipDiscs(board: Board, player: Player, position: Position): Board {
  const newBoard = board.map(row => [...row]);
  const { row, col } = position;
  const opponent = getOpponent(player);

  newBoard[row][col] = player;

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    const toFlip: Position[] = [];

    while (isValidPosition(r, c) && board[r][c] === opponent) {
      toFlip.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    if (toFlip.length > 0 && isValidPosition(r, c) && board[r][c] === player) {
      toFlip.forEach(pos => {
        newBoard[pos.row][pos.col] = player;
      });
    }
  }

  return newBoard;
}

function countDiscs(board: Board): { black: number; white: number } {
  let black = 0;
  let white = 0;

  for (const row of board) {
    for (const cell of row) {
      if (cell === 'black') black++;
      else if (cell === 'white') white++;
    }
  }

  return { black, white };
}

export function makeMove(gameState: GameState, position: Position): GameState {
  if (!isValidMove(gameState.board, gameState.currentPlayer, position)) {
    return gameState;
  }

  const newBoard = flipDiscs(gameState.board, gameState.currentPlayer, position);
  const { black, white } = countDiscs(newBoard);
  const nextPlayer = getOpponent(gameState.currentPlayer);
  const nextPlayerMoves = getPossibleMoves(newBoard, nextPlayer);
  
  let currentPlayer = nextPlayer;
  let possibleMoves = nextPlayerMoves;

  if (nextPlayerMoves.length === 0) {
    const currentPlayerMoves = getPossibleMoves(newBoard, gameState.currentPlayer);
    if (currentPlayerMoves.length > 0) {
      currentPlayer = gameState.currentPlayer;
      possibleMoves = currentPlayerMoves;
    }
  }

  const isGameOver = nextPlayerMoves.length === 0 && getPossibleMoves(newBoard, gameState.currentPlayer).length === 0;
  let winner: Player | 'draw' | null = null;

  if (isGameOver) {
    if (black > white) winner = 'black';
    else if (white > black) winner = 'white';
    else winner = 'draw';
  }

  return {
    board: newBoard,
    currentPlayer,
    blackCount: black,
    whiteCount: white,
    isGameOver,
    winner,
    possibleMoves,
    lastMove: position
  };
}