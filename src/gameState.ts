import {
  type GameState,
  HAND_SIZE,
  type Player,
  type PlacedTile,
  type Tile,
  type TileValue,
} from "./types";
import { createEmptyBoard, placeOnBoard } from "./board";
import { validateMove } from "./validation";

// ─── Tile Bag ─────────────────────────────────────────────────────────────────

const TILE_DISTRIBUTION: Record<TileValue, number> = {
  0: 7,
  1: 6,
  2: 6,
  3: 7,
  4: 10,
  5: 6,
  6: 10,
  7: 14,
  8: 12,
  9: 12,
};

export function createTileBag(): Tile[] {
  const tiles: Tile[] = [];
  let id = 0;

  for (const [valueStr, count] of Object.entries(TILE_DISTRIBUTION)) {
    const value = Number(valueStr) as TileValue;
    for (let i = 0; i < count; i++) {
      tiles.push({ id: `tile_${String(id++).padStart(3, "0")}`, value });
    }
  }

  return tiles;
}

export function shuffleBag(tiles: Tile[]): Tile[] {
  const shuffled = [...tiles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ─── Game Setup ───────────────────────────────────────────────────────────────

export interface CreateGameOptions {
  playerNames: string[];
  aiPlayerIndices?: number[];
}

export function createGame(options: CreateGameOptions): GameState {
  const { playerNames, aiPlayerIndices = [] } = options;

  if (playerNames.length < 1 || playerNames.length > 4) {
    throw new Error("Pentile requires 1–4 players.");
  }

  let bag = shuffleBag(createTileBag());

  const players: Player[] = playerNames.map((name, i) => {
    const hand: Tile[] = [];
    for (let d = 0; d < HAND_SIZE; d++) {
      hand.push(bag.pop()!);
    }
    return {
      id: `player_${i}`,
      name,
      hand,
      score: 0,
      isAI: aiPlayerIndices.includes(i),
    };
  });

  return {
    board: createEmptyBoard(),
    players,
    currentPlayerIndex: 0,
    tileBag: bag,
    phase: "playing",
    turnNumber: 0,
    consecutiveSkips: 0,
  };
}

// ─── Drawing Tiles ────────────────────────────────────────────────────────────

export function drawTiles(
  hand: Tile[],
  bag: Tile[]
): { hand: Tile[]; bag: Tile[] } {
  const newBag = [...bag];
  const newHand = [...hand];

  while (newHand.length < HAND_SIZE && newBag.length > 0) {
    newHand.push(newBag.pop()!);
  }

  return { hand: newHand, bag: newBag };
}

// ─── End Condition Helpers ────────────────────────────────────────────────────

function handPenalty(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + t.value, 0);
}

function applyEndGamePenalties(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    score: p.score - handPenalty(p.hand),
  }));
}

function isGameOver(
  players: Player[],
  bag: Tile[],
  consecutiveSkips: number
): boolean {
  if (bag.length === 0 && players.every((p) => p.hand.length === 0)) {
    return true;
  }
  if (consecutiveSkips >= players.length) {
    return true;
  }
  return false;
}

function finalizeGame(state: GameState): GameState {
  return {
    ...state,
    phase: "finished",
    players: applyEndGamePenalties(state.players),
  };
}

// ─── Turn Results ─────────────────────────────────────────────────────────────

export type TurnResult =
  | { success: true; state: GameState; scoreEarned: number }
  | { success: false; reason: string };

// ─── Take Turn ────────────────────────────────────────────────────────────────

export function takeTurn(state: GameState, placed: PlacedTile[]): TurnResult {
  if (state.phase !== "playing") {
    return { success: false, reason: "The game is not in progress." };
  }

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isFirstMove = state.board.every((row) => row.every((cell) => cell === null));

  const handIds = new Set(currentPlayer.hand.map((t) => t.id));
  for (const { tile } of placed) {
    if (!handIds.has(tile.id)) {
      return { success: false, reason: `Tile ${tile.id} is not in your hand.` };
    }
  }

  const validation = validateMove(state.board, placed, isFirstMove);
  if (!validation.valid) {
    return { success: false, reason: validation.reason };
  }

  let newBoard = state.board;
  for (const { tile, position } of placed) {
    newBoard = placeOnBoard(newBoard, position, tile);
  }

  const placedIds = new Set(placed.map((p) => p.tile.id));
  const handAfterPlacing = currentPlayer.hand.filter((t) => !placedIds.has(t.id));
  const { hand: newHand, bag: newBag } = drawTiles(handAfterPlacing, state.tileBag);

  const updatedPlayer: Player = {
    ...currentPlayer,
    hand: newHand,
    score: currentPlayer.score + validation.score,
  };

  const newPlayers = state.players.map((p, i) =>
    i === state.currentPlayerIndex ? updatedPlayer : p
  );

  let newState: GameState = {
    board: newBoard,
    players: newPlayers,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    tileBag: newBag,
    phase: "playing",
    turnNumber: state.turnNumber + 1,
    consecutiveSkips: 0, // successful placement resets the counter
  };

  if (isGameOver(newPlayers, newBag, 0)) {
    newState = finalizeGame(newState);
  }

  return { success: true, state: newState, scoreEarned: validation.score };
}

// ─── Skip Turn ────────────────────────────────────────────────────────────────

export function skipTurn(state: GameState): TurnResult {
  if (state.phase !== "playing") {
    return { success: false, reason: "The game is not in progress." };
  }

  const newConsecutiveSkips = state.consecutiveSkips + 1;

  let newState: GameState = {
    ...state,
    currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
    turnNumber: state.turnNumber + 1,
    consecutiveSkips: newConsecutiveSkips,
  };

  if (isGameOver(state.players, state.tileBag, newConsecutiveSkips)) {
    newState = finalizeGame(newState);
  }

  return { success: true, state: newState, scoreEarned: 0 };
}

// ─── Winner ───────────────────────────────────────────────────────────────────

export function getWinner(state: GameState): Player | null {
  if (state.phase !== "finished") return null;
  return state.players.reduce((best, p) => (p.score > best.score ? p : best));
}
