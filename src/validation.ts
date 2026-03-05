import {
  type Board,
  CENTER,
  MAX_SEGMENT_LENGTH,
  type MoveValidationResult,
  type PlacedTile,
  type Position,
} from "./types";
import { getAffectedSegments, isEmpty, isInBounds, orthogonalNeighbors, placeOnBoard } from "./board";

export function validateMove(
  board: Board,
  placed: PlacedTile[],
  isFirstMove: boolean
): MoveValidationResult {
  if (placed.length === 0) {
    return { valid: false, reason: "You must place at least one tile." };
  }

  if (placed.length > MAX_SEGMENT_LENGTH) {
    return { valid: false, reason: `You may place at most ${MAX_SEGMENT_LENGTH} tiles per turn.` };
  }

  for (const { position: pos } of placed) {
    if (!isInBounds(pos)) {
      return { valid: false, reason: "A tile is placed outside the board." };
    }
    if (!isEmpty(board, pos)) {
      return { valid: false, reason: `Cell (${pos.row}, ${pos.col}) is already occupied.` };
    }
  }

  const posKeys = placed.map(({ position: p }) => `${p.row},${p.col}`);
  if (new Set(posKeys).size !== posKeys.length) {
    return { valid: false, reason: "Two tiles cannot share the same cell." };
  }

  const rows = placed.map((p) => p.position.row);
  const cols = placed.map((p) => p.position.col);
  const allSameRow = rows.every((r) => r === rows[0]);
  const allSameCol = cols.every((c) => c === cols[0]);

  if (!allSameRow && !allSameCol) {
    return { valid: false, reason: "All tiles in a single turn must be placed in the same row or column." };
  }

  if (placed.length > 1) {
    const gapCheck = checkNoGaps(board, placed, allSameRow);
    if (!gapCheck.ok) return { valid: false, reason: gapCheck.reason };
  }

  if (isFirstMove) {
    const coversCenter = placed.some(
      ({ position: p }) => p.row === CENTER.row && p.col === CENTER.col
    );
    if (!coversCenter) {
      return { valid: false, reason: "The first move must include the center square." };
    }
  }

  if (!isFirstMove) {
    const touches = placed.some(({ position: pos }) =>
      orthogonalNeighbors(pos).some((n) => isInBounds(n) && !isEmpty(board, n))
    );
    if (!touches) {
      return { valid: false, reason: "At least one tile must touch a previously played tile." };
    }
  }

  const boardAfter = applyMove(board, placed);
  const affectedSegments = getAffectedSegments(boardAfter, placed.map((p) => p.position));

  for (const seg of affectedSegments) {
    if (seg.tiles.length > MAX_SEGMENT_LENGTH) {
      return { valid: false, reason: `A segment would exceed ${MAX_SEGMENT_LENGTH} tiles.` };
    }
    if (seg.sum % 5 !== 0) {
      return { valid: false, reason: `A segment sums to ${seg.sum}, which is not a multiple of 5.` };
    }
  }

  let score: number;
  if (affectedSegments.length > 0) {
    score = affectedSegments.reduce((acc, seg) => acc + seg.sum, 0);
  } else {
    // Lone tile on first move — must still be a multiple of 5
    if (placed[0].tile.value % 5 !== 0) {
      return { valid: false, reason: "A lone tile must be a multiple of 5." };
    }
    score = placed[0].tile.value;
  }

  return { valid: true, score, segments: affectedSegments };
}

/**
 * Lightweight check for mid-turn tile placement.
 * Only validates structure (single line, no gaps, center rule) —
 * does NOT check multiples of 5 or connectivity to existing tiles.
 * Those are only checked on Confirm.
 */
export function validatePartialMove(
  board: Board,
  placed: PlacedTile[],
  isFirstMove: boolean
): { valid: true } | { valid: false; reason: string } {
  if (placed.length === 0) return { valid: true }

  if (placed.length > MAX_SEGMENT_LENGTH) {
    return { valid: false, reason: `You may place at most ${MAX_SEGMENT_LENGTH} tiles per turn.` }
  }

  for (const { position: pos } of placed) {
    if (!isInBounds(pos)) {
      return { valid: false, reason: 'A tile is placed outside the board.' }
    }
    if (!isEmpty(board, pos)) {
      return { valid: false, reason: `Cell (${pos.row}, ${pos.col}) is already occupied.` }
    }
  }

  const posKeys = placed.map(({ position: p }) => `${p.row},${p.col}`)
  if (new Set(posKeys).size !== posKeys.length) {
    return { valid: false, reason: 'Two tiles cannot share the same cell.' }
  }

  if (placed.length > 1) {
    const rows = placed.map(p => p.position.row)
    const cols = placed.map(p => p.position.col)
    const allSameRow = rows.every(r => r === rows[0])
    const allSameCol = cols.every(c => c === cols[0])

    if (!allSameRow && !allSameCol) {
      return { valid: false, reason: 'All tiles must be in the same row or column.' }
    }

    const gapCheck = checkNoGaps(board, placed, allSameRow)
    if (!gapCheck.ok) return { valid: false, reason: gapCheck.reason }
  }

  if (placed.length >= 1) {
    const boardAfter = applyMove(board, placed)
    const affectedSegments = getAffectedSegments(boardAfter, placed.map(p => p.position))
    for (const seg of affectedSegments) {
      if (seg.tiles.length > MAX_SEGMENT_LENGTH) {
        return { valid: false, reason: `A segment would exceed ${MAX_SEGMENT_LENGTH} tiles.` }
      }
    }
  }

  if (isFirstMove) {
    const coversCenter = placed.some(
      ({ position: p }) => p.row === CENTER.row && p.col === CENTER.col
    )
    if (!coversCenter) {
      return { valid: false, reason: 'The first move must include the center square.' }
    }
  }

  return { valid: true }
}

function applyMove(board: Board, placed: PlacedTile[]): Board {
  let next = board;
  for (const { tile, position } of placed) {
    next = placeOnBoard(next, position, tile);
  }
  return next;
}

function checkNoGaps(
  board: Board,
  placed: PlacedTile[],
  isHorizontal: boolean
): { ok: true } | { ok: false; reason: string } {
  const placedPositions = new Set(placed.map(({ position: p }) => `${p.row},${p.col}`));

  if (isHorizontal) {
    const row = placed[0].position.row;
    const cols = placed.map((p) => p.position.col).sort((a, b) => a - b);
    for (let c = cols[0]; c <= cols[cols.length - 1]; c++) {
      if (isEmpty(board, { row, col: c }) && !placedPositions.has(`${row},${c}`)) {
        return { ok: false, reason: "Tiles in a single turn cannot have empty gaps between them." };
      }
    }
  } else {
    const col = placed[0].position.col;
    const rows = placed.map((p) => p.position.row).sort((a, b) => a - b);
    for (let r = rows[0]; r <= rows[rows.length - 1]; r++) {
      if (isEmpty(board, { row: r, col }) && !placedPositions.has(`${r},${col}`)) {
        return { ok: false, reason: "Tiles in a single turn cannot have empty gaps between them." };
      }
    }
  }

  return { ok: true };
}

