import {
  type Board,
  type BoardCell,
  BOARD_ROWS,
  BOARD_COLS,
  CENTER,
  type PlacedTile,
  type Position,
  type Segment,
  type Tile,
} from "./types";

// ─── Board Construction ───────────────────────────────────────────────────────

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );
}

export function getCell(board: Board, pos: Position): BoardCell {
  return board[pos.row]?.[pos.col] ?? null;
}

export function isInBounds(pos: Position): boolean {
  return (
    pos.row >= 0 &&
    pos.row < BOARD_ROWS &&
    pos.col >= 0 &&
    pos.col < BOARD_COLS
  );
}

export function isEmpty(board: Board, pos: Position): boolean {
  return getCell(board, pos) === null;
}

export function placeOnBoard(board: Board, pos: Position, tile: Tile): Board {
  const next = board.map((row) => [...row]);
  next[pos.row][pos.col] = tile;
  return next;
}

// ─── Segment Extraction ───────────────────────────────────────────────────────

export function getHorizontalSegment(board: Board, pos: Position): Segment | null {
  if (isEmpty(board, pos)) return null;

  let startCol = pos.col;
  while (startCol > 0 && !isEmpty(board, { row: pos.row, col: startCol - 1 })) {
    startCol--;
  }

  let endCol = pos.col;
  while (endCol < BOARD_COLS - 1 && !isEmpty(board, { row: pos.row, col: endCol + 1 })) {
    endCol++;
  }

  if (startCol === endCol) return null;

  const positions: Position[] = [];
  const tiles: Tile[] = [];
  for (let c = startCol; c <= endCol; c++) {
    const p = { row: pos.row, col: c };
    positions.push(p);
    tiles.push(getCell(board, p) as Tile);
  }

  const sum = tiles.reduce((acc, t) => acc + t.value, 0);
  return { tiles, positions, direction: "horizontal", sum };
}

export function getVerticalSegment(board: Board, pos: Position): Segment | null {
  if (isEmpty(board, pos)) return null;

  let startRow = pos.row;
  while (startRow > 0 && !isEmpty(board, { row: startRow - 1, col: pos.col })) {
    startRow--;
  }

  let endRow = pos.row;
  while (endRow < BOARD_ROWS - 1 && !isEmpty(board, { row: endRow + 1, col: pos.col })) {
    endRow++;
  }

  if (startRow === endRow) return null;

  const positions: Position[] = [];
  const tiles: Tile[] = [];
  for (let r = startRow; r <= endRow; r++) {
    const p = { row: r, col: pos.col };
    positions.push(p);
    tiles.push(getCell(board, p) as Tile);
  }

  const sum = tiles.reduce((acc, t) => acc + t.value, 0);
  return { tiles, positions, direction: "vertical", sum };
}

export function getAffectedSegments(board: Board, positions: Position[]): Segment[] {
  const seen = new Set<string>();
  const segments: Segment[] = [];

  for (const pos of positions) {
    for (const seg of [
      getHorizontalSegment(board, pos),
      getVerticalSegment(board, pos),
    ]) {
      if (!seg) continue;
      const key = `${seg.direction}:${seg.positions[0].row},${seg.positions[0].col}`;
      if (!seen.has(key)) {
        seen.add(key);
        segments.push(seg);
      }
    }
  }

  return segments;
}

export function getValidPlacementCells(
  board: Board,
  stagedMoves: PlacedTile[],
  isFirstMove: boolean
): Set<string> {
  const valid = new Set<string>()

  // Build a combined occupied map (board + staged)
  const isOccupied = (pos: Position): boolean =>
    !isEmpty(board, pos) ||
    stagedMoves.some(m => m.position.row === pos.row && m.position.col === pos.col)

  // Helper: any unoccupied cell strictly between two columns in the same row?
  const hasGapInRow = (row: number, colA: number, colB: number): boolean => {
    const [min, max] = [Math.min(colA, colB), Math.max(colA, colB)]
    for (let col = min + 1; col < max; col++) {
      if (!isOccupied({ row, col })) return true
    }
    return false
  }

  // Helper: any unoccupied cell strictly between two rows in the same column?
  const hasGapInCol = (col: number, rowA: number, rowB: number): boolean => {
    const [min, max] = [Math.min(rowA, rowB), Math.max(rowA, rowB)]
    for (let row = min + 1; row < max; row++) {
      if (!isOccupied({ row, col })) return true
    }
    return false
  }

  // Helper: would placing at pos create a segment of 6+ in a given direction?
  const wouldExceedMax = (pos: Position): boolean => {
    let hCount = 1
    for (let c = pos.col - 1; c >= 0 && isOccupied({ row: pos.row, col: c }); c--) hCount++
    for (let c = pos.col + 1; c < BOARD_COLS && isOccupied({ row: pos.row, col: c }); c++) hCount++

    let vCount = 1
    for (let r = pos.row - 1; r >= 0 && isOccupied({ row: r, col: pos.col }); r--) vCount++
    for (let r = pos.row + 1; r < BOARD_ROWS && isOccupied({ row: r, col: pos.col }); r++) vCount++

    return hCount > 5 || vCount > 5
  }

  // Determine committed direction from staged moves
  type Direction = 'horizontal' | 'vertical' | 'none'
  let committedDirection: Direction = 'none'
  if (stagedMoves.length >= 2) {
    const allSameRow = stagedMoves.every(m => m.position.row === stagedMoves[0].position.row)
    committedDirection = allSameRow ? 'horizontal' : 'vertical'
  } else if (stagedMoves.length === 1) {
    // One tile staged — both directions still open, but we can infer from
    // existing board tiles in the same row/col
    committedDirection = 'none'
  }

  // On first move with nothing staged, only highlight center
  if (isFirstMove && stagedMoves.length === 0) {
    valid.add(`${CENTER.row},${CENTER.col}`)
    return valid
  }

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const pos: Position = { row: r, col: c }
      if (isOccupied(pos)) continue
      if (wouldExceedMax(pos)) continue

      // Must be adjacent to an occupied cell
      const adjacent = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 },
      ].some(n => isInBounds(n) && isOccupied(n))
      if (!adjacent) continue

      // With one tile staged, next tile must share its row or column with no gaps
      if (stagedMoves.length === 1 && committedDirection === 'none') {
        const staged = stagedMoves[0].position
        if (r !== staged.row && c !== staged.col) continue
        if (r === staged.row ? hasGapInRow(r, c, staged.col) : hasGapInCol(c, r, staged.row)) continue
      }

      // If direction is committed, only allow cells in that row/col with no gaps
      if (committedDirection === 'horizontal') {
        if (r !== stagedMoves[0].position.row) continue
        const stagedCols = stagedMoves.map(m => m.position.col)
        const minCol = Math.min(...stagedCols)
        const maxCol = Math.max(...stagedCols)
        if (hasGapInRow(r, c, minCol) || hasGapInRow(r, c, maxCol)) continue
      } else if (committedDirection === 'vertical') {
        if (c !== stagedMoves[0].position.col) continue
        const stagedRows = stagedMoves.map(m => m.position.row)
        const minRow = Math.min(...stagedRows)
        const maxRow = Math.max(...stagedRows)
        if (hasGapInCol(c, r, minRow) || hasGapInCol(c, r, maxRow)) continue
      }

      valid.add(`${r},${c}`)
    }
  }

  return valid
}
