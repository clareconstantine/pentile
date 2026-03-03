import type { Board, GameState, PlacedTile, Position, Tile } from "./types";
import { BOARD_ROWS, BOARD_COLS } from "./types";
import { isEmpty, isInBounds } from "./board";
import { validateMove } from "./validation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIDifficulty = "easy" | "medium";

export interface AIMove {
  placed: PlacedTile[];
  score: number;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Find the best move for the current player given the difficulty level.
 * Returns null if no valid move exists (player must skip).
 */
export function findBestMove(
  state: GameState,
  difficulty: AIDifficulty
): AIMove | null {
  const player = state.players[state.currentPlayerIndex];
  const isFirstMove = state.board.every((row) => row.every((cell) => cell === null));

  if (difficulty === 'easy') {
    return findFirstValidMove(state.board, player.hand, isFirstMove);
  }

  // medium: find all moves, pick highest scoring
  const allMoves = findAllValidMoves(state.board, player.hand, isFirstMove);
  if (allMoves.length === 0) return null;
  const maxScore = Math.max(...allMoves.map(m => m.score));
  const best = allMoves.filter(m => m.score === maxScore);
  return pickRandom(best);
}

// ─── Move Generation ──────────────────────────────────────────────────────────

function findFirstValidMove(
  board: Board,
  hand: Tile[],
  isFirstMove: boolean
): AIMove | null {
  const candidates = isFirstMove
    ? getFirstMoveCandidates()
    : getAdjacentCandidates(board);

  // Shuffle candidates so easy mode doesn't always play in the same spot
  const shuffledCandidates = [...candidates].sort(() => Math.random() - 0.5)
  const shuffledHand = [...hand].sort(() => Math.random() - 0.5)

  // Try single tiles first — fast
  for (const tile of shuffledHand) {
    for (const pos of shuffledCandidates) {
      if (!isEmpty(board, pos)) continue;
      const placed: PlacedTile[] = [{ tile, position: pos }];
      const result = validateMove(board, placed, isFirstMove);
      if (result.valid) return { placed, score: result.score };
    }
  }

  // Fall back to multi-tile if no single tile works
  const lines = getCandidateLines(board, candidates, isFirstMove);
  for (const line of lines) {
    const moves = findLineMovesForHand(board, hand, line, isFirstMove);
    if (moves.length > 0) return pickRandom(moves);
  }

  return null;
}

function findAllValidMoves(
  board: Board,
  hand: Tile[],
  isFirstMove: boolean
): AIMove[] {
  const moves: AIMove[] = [];
  const candidates = isFirstMove
    ? getFirstMoveCandidates()
    : getAdjacentCandidates(board);

  // Try placing 1 tile at a time
  for (const tile of hand) {
    for (const pos of candidates) {
      if (!isEmpty(board, pos)) continue;
      const placed: PlacedTile[] = [{ tile, position: pos }];
      const result = validateMove(board, placed, isFirstMove);
      if (result.valid) {
        moves.push({ placed, score: result.score });
      }
    }
  }

  // Try placing 2–5 tiles in a line
  // Only search along rows/cols that contain candidate positions
  const lines = getCandidateLines(board, candidates, isFirstMove);

  for (const line of lines) {
    const lineMoves = findLineMovesForHand(board, hand, line, isFirstMove);
    moves.push(...lineMoves);
  }

  return moves;
}

/**
 * For the first move, only the center cell is a candidate.
 * We expand from there by trying multi-tile placements through center.
 */
function getFirstMoveCandidates(): Position[] {
  return [{ row: 6, col: 8 }]; // CENTER
}

/**
 * Return all empty cells adjacent to an occupied cell.
 * These are the only positions where a new tile can legally touch the board.
 */
function getAdjacentCandidates(board: Board): Position[] {
  const seen = new Set<string>();
  const candidates: Position[] = [];

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r][c] === null) continue;
      for (const neighbor of orthogonalNeighbors({ row: r, col: c })) {
        const key = `${neighbor.row},${neighbor.col}`;
        if (!seen.has(key) && isInBounds(neighbor) && isEmpty(board, neighbor)) {
          seen.add(key);
          candidates.push(neighbor);
        }
      }
    }
  }

  return candidates;
}

/**
 * Given candidate positions, return the set of row/col lines that are worth
 * searching for multi-tile placements. A "line" is a {row or col, fixed index}.
 */
interface Line {
  direction: "horizontal" | "vertical";
  index: number; // row index for horizontal, col index for vertical
}

function getCandidateLines(
  _board: Board,
  candidates: Position[],
  isFirstMove: boolean
): Line[] {
  const seen = new Set<string>();
  const lines: Line[] = [];

  if (isFirstMove) {
    // First move can be horizontal or vertical through center
    lines.push({ direction: "horizontal", index: 6 });
    lines.push({ direction: "vertical", index: 8 });
    return lines;
  }

  for (const pos of candidates) {
    const hKey = `h:${pos.row}`;
    if (!seen.has(hKey)) {
      seen.add(hKey);
      lines.push({ direction: "horizontal", index: pos.row });
    }
    const vKey = `v:${pos.col}`;
    if (!seen.has(vKey)) {
      seen.add(vKey);
      lines.push({ direction: "vertical", index: pos.col });
    }
  }

  return lines;
}

/**
 * Find all valid multi-tile moves (2–5 tiles) along a single line,
 * using tiles from the given hand.
 */
function findLineMovesForHand(
  board: Board,
  hand: Tile[],
  line: Line,
  isFirstMove: boolean
): AIMove[] {
  const moves: AIMove[] = [];

  // Find empty cells in this line that are close enough to an occupied cell
  // to be part of a valid run (max run length is 5, so at most 4 away)
  const emptyCells: Position[] = [];
  const length = line.direction === "horizontal" ? BOARD_COLS : BOARD_ROWS;
  const MAX_REACH = 4;

  const occupiedIndices = new Set<number>();
  for (let i = 0; i < length; i++) {
    const pos: Position =
      line.direction === "horizontal"
        ? { row: line.index, col: i }
        : { row: i, col: line.index };
    if (isInBounds(pos) && !isEmpty(board, pos)) occupiedIndices.add(i);
  }

  for (let i = 0; i < length; i++) {
    const pos: Position =
      line.direction === "horizontal"
        ? { row: line.index, col: i }
        : { row: i, col: line.index };

    if (!isInBounds(pos) || !isEmpty(board, pos)) continue;

    const nearOccupied = isFirstMove ||
      [...occupiedIndices].some(occ => Math.abs(i - occ) <= MAX_REACH);
    if (nearOccupied) emptyCells.push(pos);
  }

  // Try all combinations of 2–5 tiles from hand placed into empty cells in this line
  // We enumerate subsets of hand tiles and subsets of empty positions
  for (let count = 2; count <= Math.min(5, hand.length, emptyCells.length); count++) {
    const handSubsets = combinations(hand, count);
    const posSubsets = combinations(emptyCells, count);

    for (const tiles of handSubsets) {
      for (const positions of posSubsets) {
        // Try all permutations of tiles into these positions
        const perms = permutations(tiles);
        for (const tilePerm of perms) {
          const placed: PlacedTile[] = positions.map((position, i) => ({
            tile: tilePerm[i],
            position,
          }));
          const result = validateMove(board, placed, isFirstMove);
          if (result.valid) {
            moves.push({ placed, score: result.score });
          }
        }
      }
    }
  }

  return moves;
}

// ─── Combinatorics helpers ────────────────────────────────────────────────────

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((item, i) => {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    return permutations(rest).map((p) => [item, ...p]);
  });
}

function orthogonalNeighbors(pos: Position): Position[] {
  return [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
