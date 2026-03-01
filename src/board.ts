import {
  Board,
  BoardCell,
  BOARD_ROWS,
  BOARD_COLS,
  Position,
  Segment,
  Tile,
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
