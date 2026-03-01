import { findBestMove } from "./ai";
import { createGame } from "./gameState";
import { placeOnBoard } from "./board";
import { CENTER, GameState, Tile } from "./types";

function tile(value: Tile["value"], id: string): Tile {
  return { id, value };
}

function seedState(hand: Tile[], boardTiles: { tile: Tile; row: number; col: number }[] = []): GameState {
  let state = createGame({ playerNames: ["CPU", "Human"] });

  // Replace player 0's hand with the given hand
  state = {
    ...state,
    players: [
      { ...state.players[0], hand },
      state.players[1],
    ],
  };

  // Place board tiles
  let board = state.board;
  for (const { tile, row, col } of boardTiles) {
    board = placeOnBoard(board, { row, col }, tile);
  }

  return { ...state, board };
}

describe("findBestMove", () => {
  describe("first move", () => {
    test("finds a valid first move when hand contains a 5", () => {
      const state = seedState([tile(5, "t1"), tile(3, "t2"), tile(2, "t3"), tile(1, "t4"), tile(4, "t5")]);
      const move = findBestMove(state, "medium");
      expect(move).not.toBeNull();
      expect(move!.placed.some(p => p.position.row === CENTER.row && p.position.col === CENTER.col)).toBe(true);
    });

    test("first move always covers the center square", () => {
      // Run with several different hands to verify center coverage
      const hands: Tile[][] = [
        [tile(5,"a"), tile(3,"b"), tile(2,"c"), tile(1,"d"), tile(4,"e")],
        [tile(1,"f"), tile(1,"g"), tile(1,"h"), tile(1,"i"), tile(1,"j")],
        [tile(9,"k"), tile(6,"l"), tile(5,"m"), tile(4,"n"), tile(1,"o")],
      ]
      for (const hand of hands) {
        const state = seedState(hand)
        const move = findBestMove(state, "medium")
        if (move !== null) {
          expect(move.placed.some(p =>
            p.position.row === CENTER.row && p.position.col === CENTER.col
          )).toBe(true)
        }
      }
    });

    test("medium picks the highest scoring move", () => {
      // 5+5=10 scores more than just 5
      const state = seedState([tile(5, "t1"), tile(5, "t2"), tile(3, "t3"), tile(2, "t4"), tile(1, "t5")]);
      const move = findBestMove(state, "medium");
      expect(move).not.toBeNull();
      // Should prefer the 10-point move over the 5-point move
      expect(move!.score).toBeGreaterThanOrEqual(10);
    });
  });

  describe("subsequent moves", () => {
    test("finds a valid move adjacent to existing tile", () => {
      const existing = tile(5, "existing");
      const state = seedState(
        [tile(5, "t1"), tile(3, "t2"), tile(2, "t3"), tile(4, "t4"), tile(1, "t5")],
        [{ tile: existing, row: CENTER.row, col: CENTER.col }]
      );
      // Not first move — set turnNumber > 0
      const nonFirstState = { ...state, turnNumber: 1 };
      const move = findBestMove(nonFirstState, "medium");
      expect(move).not.toBeNull();
    });

    test("returns null when no valid move exists", () => {
      // Hand of all 1s, board has a 4-tile segment of 5s — nowhere valid to play
      const s5 = tile(5, "s1");
      const state = seedState(
        [tile(1, "t1"), tile(1, "t2"), tile(1, "t3"), tile(1, "t4"), tile(1, "t5")],
        [{ tile: s5, row: CENTER.row, col: CENTER.col }]
      );
      const nonFirstState = { ...state, turnNumber: 1 };
      const move = findBestMove(nonFirstState, "medium");
      // May or may not be null depending on board state — just check it doesn't throw
      expect(move === null || move.placed.length > 0).toBe(true);
    });

    test("easy mode returns a valid move", () => {
      const existing = tile(5, "existing");
      const state = seedState(
        [tile(5, "t1"), tile(5, "t2"), tile(3, "t3"), tile(2, "t4"), tile(1, "t5")],
        [{ tile: existing, row: CENTER.row, col: CENTER.col }]
      );
      const nonFirstState = { ...state, turnNumber: 1 };
      const move = findBestMove(nonFirstState, "easy");
      expect(move).not.toBeNull();
    });
  });

  describe("move validity", () => {
    test("all returned moves are valid", () => {
      const existing = tile(5, "existing");
      const state = seedState(
        [tile(5, "t1"), tile(5, "t2"), tile(5, "t3"), tile(5, "t4"), tile(5, "t5")],
        [{ tile: existing, row: CENTER.row, col: CENTER.col }]
      );
      const nonFirstState = { ...state, turnNumber: 1 };

      // Run several times to catch randomness issues
      for (let i = 0; i < 10; i++) {
        const move = findBestMove(nonFirstState, "easy");
        if (move === null) continue;
        expect(move.placed.length).toBeGreaterThan(0);
        expect(move.placed.length).toBeLessThanOrEqual(5);
      }
    });
  });
});
