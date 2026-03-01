// ─── Constants ────────────────────────────────────────────────────────────────

export const BOARD_ROWS = 13;
export const BOARD_COLS = 17;
export const CENTER: Position = { row: 6, col: 8 };
export const MAX_SEGMENT_LENGTH = 5;
export const HAND_SIZE = 5;

// ─── Primitives ───────────────────────────────────────────────────────────────

export type TileValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface Tile {
  id: string;
  value: TileValue;
}

export interface Position {
  row: number; // 0 – BOARD_ROWS-1
  col: number; // 0 – BOARD_COLS-1
}

// A tile placed at a specific position (used when proposing a move)
export interface PlacedTile {
  tile: Tile;
  position: Position;
}

// ─── Board ────────────────────────────────────────────────────────────────────

// null means the cell is empty
export type BoardCell = Tile | null;
export type Board = BoardCell[][];

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase = "setup" | "playing" | "finished";

export interface Player {
  id: string;
  name: string;
  hand: Tile[];
  score: number;
  isAI: boolean;
}

export interface GameState {
  board: Board;
  players: Player[];
  currentPlayerIndex: number;
  tileBag: Tile[];
  phase: GamePhase;
  turnNumber: number;
  consecutiveSkips: number; // resets to 0 on any successful placement
}

// ─── Move Validation ──────────────────────────────────────────────────────────

export type MoveValidationResult =
  | { valid: true; score: number; segments: Segment[] }
  | { valid: false; reason: string };

// A contiguous horizontal or vertical run of tiles on the board
export interface Segment {
  tiles: Tile[];
  positions: Position[];
  direction: "horizontal" | "vertical";
  sum: number;
}
