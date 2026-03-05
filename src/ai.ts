import type { Board, GameState, PlacedTile, Position, Tile, TileValue } from "./types";
import { BOARD_ROWS, BOARD_COLS, CENTER } from "./types";
import { isBoardEmpty, isEmpty, isInBounds, orthogonalNeighbors } from "./board";
import { validateMove } from "./validation";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIDifficulty = "easy" | "medium" | "hard";

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
  const isFirstMove = isBoardEmpty(state.board);

  if (difficulty === 'easy') {
    return findDecentMove(state.board, player.hand, isFirstMove);
  }

  const allMoves = findAllValidMoves(state.board, player.hand, isFirstMove);
  if (allMoves.length === 0) return null;

  if (difficulty === 'medium') {
    const maxScore = Math.max(...allMoves.map(m => m.score));
    const best = allMoves.filter(m => m.score === maxScore);
    return pickRandom(best);
  }

  // hard: maximize my score while minimizing opportunities left for opponents
  return findStrategicMove(state.board, allMoves);
}

// ─── Move Generation ──────────────────────────────────────────────────────────

/**
 * Find a reasonable move: picks randomly from all valid moves that score
 * at least half the best available score. Better than random but not optimal.
 */
function findDecentMove(
  board: Board,
  hand: Tile[],
  isFirstMove: boolean
): AIMove | null {
  const allMoves = findAllValidMoves(board, hand, isFirstMove);
  if (allMoves.length === 0) return null;

  const maxScore = Math.max(...allMoves.map(m => m.score));
  const decent = allMoves.filter(m => m.score >= maxScore / 2);
  return pickRandom(decent);
}


/**
 * Hard mode: pick the move that maximizes (my_score - DEFENSIVE_WEIGHT * opponent_opportunity).
 * opponent_opportunity = the best single-tile score any opponent could achieve after my move,
 * estimated by trying all tile values 0–9 in every adjacent empty cell.
 */
const DEFENSIVE_WEIGHT = 0.5;

function findStrategicMove(board: Board, moves: AIMove[]): AIMove {
  let bestMoves: AIMove[] = [];
  let bestHeuristic = -Infinity;

  for (const move of moves) {
    const simBoard = applyMoveToBoard(board, move.placed);
    const opponentBest = estimateOpponentOpportunity(simBoard);
    const heuristic = move.score - DEFENSIVE_WEIGHT * opponentBest;

    if (heuristic > bestHeuristic) {
      bestHeuristic = heuristic;
      bestMoves = [move];
    } else if (heuristic === bestHeuristic) {
      bestMoves.push(move);
    }
  }

  return pickRandom(bestMoves);
}

function applyMoveToBoard(board: Board, placed: PlacedTile[]): Board {
  const newBoard = board.map(row => [...row]);
  for (const { tile, position } of placed) {
    newBoard[position.row][position.col] = tile;
  }
  return newBoard;
}

/**
 * Estimate the best score an opponent could achieve with a single tile
 * placed anywhere adjacent to the current board state. Tries all values 0–9
 * at each candidate position and returns the maximum valid score found.
 */
function estimateOpponentOpportunity(board: Board): number {
  let maxScore = 0;
  const candidates = getAdjacentCandidates(board);

  for (const pos of candidates) {
    for (let v = 0; v <= 9; v++) {
      const tile: Tile = { id: '_hyp', value: v as TileValue };
      const result = validateMove(board, [{ tile, position: pos }], false);
      if (result.valid && result.score > maxScore) {
        maxScore = result.score;
      }
    }
  }

  return maxScore;
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
const linePos = (line: Line, i: number): Position =>
  line.direction === "horizontal"
    ? { row: line.index, col: i }
    : { row: i, col: line.index };

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
    const pos = linePos(line, i);
    if (isInBounds(pos) && !isEmpty(board, pos)) occupiedIndices.add(i);
  }

  for (let i = 0; i < length; i++) {
    const pos = linePos(line, i);
    if (!isInBounds(pos) || !isEmpty(board, pos)) continue;

    const nearOccupied = isFirstMove ||
      [...occupiedIndices].some(occ => Math.abs(i - occ) <= MAX_REACH);
    if (nearOccupied) emptyCells.push(pos);
  }

  // For the first move, only contiguous runs through the center are valid.
  // This avoids the C(17,5) combinatorial explosion of arbitrary position subsets.
  if (isFirstMove) {
    const centerIdx = line.direction === "horizontal" ? CENTER.col : CENTER.row;
    for (let count = 2; count <= Math.min(5, hand.length); count++) {
      const handSubsets = combinations(hand, count);
      for (let start = centerIdx - count + 1; start <= centerIdx; start++) {
        const positions: Position[] = [];
        let valid = true;
        for (let i = start; i < start + count; i++) {
          const pos = linePos(line, i);
          if (!isInBounds(pos)) { valid = false; break; }
          positions.push(pos);
        }
        if (!valid) continue;
        for (const tiles of handSubsets) {
          const perms = permutations(tiles);
          for (const tilePerm of perms) {
            const placed: PlacedTile[] = positions.map((position, i) => ({
              tile: tilePerm[i],
              position,
            }));
            const result = validateMove(board, placed, isFirstMove);
            if (result.valid) moves.push({ placed, score: result.score });
          }
        }
      }
    }
    return moves;
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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
