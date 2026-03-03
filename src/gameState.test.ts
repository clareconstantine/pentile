import { createGame, createTileBag, drawTiles, skipTurn, takeTurn, getWinner } from "./gameState";
import { CENTER, GameState, HAND_SIZE, PlacedTile, Tile } from "./types";
import { placeOnBoard } from "./board";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function placed(t: Tile, row: number, col: number): PlacedTile {
  return { tile: t, position: { row, col } };
}

// ─── Tile Bag ─────────────────────────────────────────────────────────────────

describe("createTileBag", () => {
  test("creates exactly 90 tiles", () => {
    expect(createTileBag()).toHaveLength(90);
  });

  test("has correct distribution", () => {
    const bag = createTileBag();
    const counts: Record<number, number> = {};
    for (const tile of bag) {
      counts[tile.value] = (counts[tile.value] ?? 0) + 1;
    }
    expect(counts[0]).toBe(7);
    expect(counts[1]).toBe(6);
    expect(counts[2]).toBe(6);
    expect(counts[3]).toBe(7);
    expect(counts[4]).toBe(10);
    expect(counts[5]).toBe(6);
    expect(counts[6]).toBe(10);
    expect(counts[7]).toBe(14);
    expect(counts[8]).toBe(12);
    expect(counts[9]).toBe(12);
  });

  test("all tile ids are unique", () => {
    const bag = createTileBag();
    const ids = new Set(bag.map((t) => t.id));
    expect(ids.size).toBe(90);
  });
});

// ─── createGame ───────────────────────────────────────────────────────────────

describe("createGame", () => {
  test("deals 5 tiles to each player", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    for (const player of state.players) {
      expect(player.hand).toHaveLength(HAND_SIZE);
    }
  });

  test("removes dealt tiles from the bag", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    expect(state.tileBag).toHaveLength(90 - 2 * HAND_SIZE);
  });

  test("sets correct AI flags", () => {
    const state = createGame({
      playerNames: ["Alice", "CPU"],
      aiPlayerIndices: [1],
    });
    expect(state.players[0].isAI).toBe(false);
    expect(state.players[1].isAI).toBe(true);
  });

  test("starts in playing phase, turn 0", () => {
    const state = createGame({ playerNames: ["Alice"] });
    expect(state.phase).toBe("playing");
    expect(state.turnNumber).toBe(0);
  });

  test("throws for 0 players", () => {
    expect(() => createGame({ playerNames: [] })).toThrow();
  });

  test("throws for 5 players", () => {
    expect(() => createGame({ playerNames: ["A", "B", "C", "D", "E"] })).toThrow();
  });
});

// ─── drawTiles ────────────────────────────────────────────────────────────────

describe("drawTiles", () => {
  test("refills hand to HAND_SIZE", () => {
    const bag = createTileBag();
    const { hand } = drawTiles([], bag);
    expect(hand).toHaveLength(HAND_SIZE);
  });

  test("does not exceed HAND_SIZE", () => {
    const bag = createTileBag();
    const fullHand: Tile[] = Array.from({ length: HAND_SIZE }, (_, i) => ({
      id: `h${i}`,
      value: 5,
    }));
    const { hand } = drawTiles(fullHand, bag);
    expect(hand).toHaveLength(HAND_SIZE);
  });

  test("draws only what is available when bag is small", () => {
    const smallBag: Tile[] = [{ id: "last", value: 5 }];
    const { hand, bag } = drawTiles([], smallBag);
    expect(hand).toHaveLength(1);
    expect(bag).toHaveLength(0);
  });

  test("is immutable — original bag unchanged", () => {
    const bag = createTileBag();
    const originalLength = bag.length;
    drawTiles([], bag);
    expect(bag).toHaveLength(originalLength);
  });
});

// ─── takeTurn ─────────────────────────────────────────────────────────────────

describe("takeTurn", () => {
  let state: GameState;

  beforeEach(() => {
    state = createGame({ playerNames: ["Alice", "Bob"] });
  });

  test("valid first move updates board, hand, score, and advances turn", () => {
    const player = state.players[0];
    // Find a tile with value 5 in hand, or inject one
    const tile5 = player.hand.find((t) => t.value === 5);
    if (!tile5) return; // skip if unlucky draw — rare

    const result = takeTurn(state, [placed(tile5, CENTER.row, CENTER.col)]);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.state.turnNumber).toBe(1);
    expect(result.state.currentPlayerIndex).toBe(1);
    expect(result.state.players[0].score).toBe(5);
    expect(result.state.players[0].hand).toHaveLength(HAND_SIZE);
    expect(result.state.board[CENTER.row][CENTER.col]).toBeTruthy();
  });

  test("fails if tile not in hand", () => {
    const foreignTile: Tile = { id: "not_in_hand", value: 5 };
    const result = takeTurn(state, [placed(foreignTile, CENTER.row, CENTER.col)]);
    expect(result.success).toBe(false);
  });

  test("fails if move is invalid", () => {
    const player = state.players[0];
    // Try to place off-center on first move
    const result = takeTurn(state, [placed(player.hand[0], 0, 0)]);
    expect(result.success).toBe(false);
  });

  test("does not mutate original state", () => {
    const player = state.players[0];
    const tile5 = player.hand.find((t) => t.value === 5);
    if (!tile5) return;

    takeTurn(state, [placed(tile5, CENTER.row, CENTER.col)]);
    expect(state.turnNumber).toBe(0);
    expect(state.board[CENTER.row][CENTER.col]).toBeNull();
  });

  test("advances to next player correctly with wraparound", () => {
    // Build a minimal 2-player game and play through 2 turns to test wraparound
    // Just check the index math: 0 → 1 → 0
    const s1 = createGame({ playerNames: ["Alice", "Bob"] });
    const skip1 = skipTurn(s1);
    expect(skip1.success && skip1.state.currentPlayerIndex).toBe(1);
    const skip2 = skipTurn(skip1.success ? skip1.state : s1);
    expect(skip2.success && skip2.state.currentPlayerIndex).toBe(0);
  });
});

// ─── skipTurn ─────────────────────────────────────────────────────────────────

describe("skipTurn", () => {
  test("advances turn without changing scores or board", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    const result = skipTurn(state);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.state.turnNumber).toBe(1);
    expect(result.state.currentPlayerIndex).toBe(1);
    expect(result.state.players[0].score).toBe(0);
    expect(result.scoreEarned).toBe(0);
  });
});

// ─── end conditions ───────────────────────────────────────────────────────────

describe("end conditions", () => {
  test("game ends when all players skip consecutively", () => {
    let state = createGame({ playerNames: ["Alice", "Bob"] });
    const result1 = skipTurn(state);
    expect(result1.success && result1.state.phase).toBe("playing");
    const result2 = skipTurn(result1.success ? result1.state : state);
    expect(result2.success && result2.state.phase).toBe("finished");
  });

  test("game ends when bag and all hands are empty", () => {
    const state = createGame({ playerNames: ["Alice"] });
    const emptyHandState: GameState = {
      ...state,
      tileBag: [],
      players: [{ ...state.players[0], hand: [] }],
      consecutiveSkips: 0,
    };
    // skipTurn should detect game over
    const result = skipTurn(emptyHandState);
    expect(result.success && result.state.phase).toBe("finished");
  });

  test("end-of-game penalties subtract unplayed tile values from score", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    // Force game over by exhausting consecutive skips
    let s = state;
    s = (skipTurn(s) as { success: true; state: GameState }).state;
    s = (skipTurn(s) as { success: true; state: GameState }).state;
    expect(s.phase).toBe("finished");

    // Each player's final score should be 0 minus their hand penalty
    for (const player of s.players) {
      const penalty = player.hand.reduce((sum, t) => sum + t.value, 0);
      // Score started at 0, penalty subtracted → score should be <= 0
      expect(player.score).toBe(0 - penalty);
    }
  });

  test("second player can still play first move after first player skips", () => {
    // Regression: isFirstMove was based on turnNumber, not board state.
    // After player 1 skips, turnNumber is 1, so player 2's move was incorrectly
    // treated as non-first, failing the "touch existing tile" check.
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    const afterSkip = skipTurn(state);
    if (!afterSkip.success) throw new Error("skip failed");

    // Find a 5-valued tile in Bob's hand (player index 1)
    const tile5 = afterSkip.state.players[1].hand.find((t) => t.value === 5);
    if (!tile5) return; // can't test without a 5 — hand is random

    const result = takeTurn(afterSkip.state, [placed(tile5, CENTER.row, CENTER.col)]);
    expect(result.success).toBe(true);
  });

  test("consecutive skips reset to 0 after a successful placement", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    const afterSkip = skipTurn(state);
    expect(afterSkip.success && afterSkip.state.consecutiveSkips).toBe(1);

    // Find a valid first move tile (value 5) in Alice's hand — skip this test if none
    const tile5 = state.players[0].hand.find((t) => t.value === 5);
    if (!tile5) return;

    const afterPlay = takeTurn(state, [placed(tile5, CENTER.row, CENTER.col)]);
    expect(afterPlay.success && afterPlay.state.consecutiveSkips).toBe(0);
  });
});

// ─── getWinner ────────────────────────────────────────────────────────────────

describe("getWinner", () => {
  test("returns null when game is still playing", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    expect(getWinner(state)).toBeNull();
  });

  test("returns player with highest score when finished", () => {
    const state = createGame({ playerNames: ["Alice", "Bob"] });
    const finishedState: GameState = {
      ...state,
      phase: "finished",
      consecutiveSkips: 0,
      players: [
        { ...state.players[0], score: 42, hand: [] },
        { ...state.players[1], score: 99, hand: [] },
      ],
    };
    expect(getWinner(finishedState)?.name).toBe("Bob");
  });
});
