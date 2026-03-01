import { createEmptyBoard, placeOnBoard } from "./board";
import { validateMove } from "./validation";
import { Board, CENTER, PlacedTile, Tile } from "./types";

let idCounter = 0;
function tile(value: Tile["value"]): Tile {
  return { id: `t${++idCounter}`, value };
}
function placed(t: Tile, row: number, col: number): PlacedTile {
  return { tile: t, position: { row, col } };
}

describe("validateMove", () => {
  let board: Board;

  beforeEach(() => {
    board = createEmptyBoard();
    idCounter = 0;
  });

  describe("first move", () => {
    test("valid: single tile = 5 on center", () => {
      const result = validateMove(board, [placed(tile(5), CENTER.row, CENTER.col)], true);
      expect(result.valid).toBe(true);
    });

    test("valid: single tile = 0 on center scores 0", () => {
      const result = validateMove(board, [placed(tile(0), CENTER.row, CENTER.col)], true);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.score).toBe(0);
    });

    test("valid: single tile = 5 on center scores 5", () => {
      const result = validateMove(board, [placed(tile(5), CENTER.row, CENTER.col)], true);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.score).toBe(5);
    });

    test("valid: 2-tile row summing to 5 covering center", () => {
      const result = validateMove(board, [
        placed(tile(2), CENTER.row, CENTER.col),
        placed(tile(3), CENTER.row, CENTER.col + 1),
      ], true);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.score).toBe(5);
    });

    test("invalid: does not cover center", () => {
      const result = validateMove(board, [placed(tile(5), CENTER.row, CENTER.col + 1)], true);
      expect(result.valid).toBe(false);
    });

    test("invalid: sum is not a multiple of 5", () => {
      const result = validateMove(board, [placed(tile(3), CENTER.row, CENTER.col)], true);
      expect(result.valid).toBe(false);
    });
  });

  describe("subsequent moves", () => {
    beforeEach(() => {
      board = placeOnBoard(board, CENTER, tile(5));
    });

    test("valid: extend center tile to make a sum of 10", () => {
      const result = validateMove(board, [placed(tile(5), CENTER.row, CENTER.col + 1)], false);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.score).toBe(10);
    });

    test("invalid: does not touch existing tile", () => {
      const result = validateMove(board, [placed(tile(5), 0, 0)], false);
      expect(result.valid).toBe(false);
    });

    test("invalid: segment would exceed 5 tiles", () => {
      let b = board;
      b = placeOnBoard(b, { row: CENTER.row, col: CENTER.col + 1 }, tile(5));
      b = placeOnBoard(b, { row: CENTER.row, col: CENTER.col + 2 }, tile(5));
      b = placeOnBoard(b, { row: CENTER.row, col: CENTER.col + 3 }, tile(5));
      b = placeOnBoard(b, { row: CENTER.row, col: CENTER.col + 4 }, tile(5));
      const result = validateMove(b, [placed(tile(5), CENTER.row, CENTER.col + 5)], false);
      expect(result.valid).toBe(false);
    });

    test("invalid: L-shape placement", () => {
      const result = validateMove(board, [
        placed(tile(2), CENTER.row, CENTER.col + 1),
        placed(tile(3), CENTER.row + 1, CENTER.col + 1),
      ], false);
      expect(result.valid).toBe(false);
    });

    test("invalid: gap between placed tiles", () => {
      const result = validateMove(board, [
        placed(tile(2), CENTER.row, CENTER.col + 1),
        placed(tile(3), CENTER.row, CENTER.col + 3),
      ], false);
      expect(result.valid).toBe(false);
    });

    test("valid: gap filled by existing tile", () => {
      const b = placeOnBoard(board, { row: CENTER.row, col: CENTER.col + 2 }, tile(1));
      const result = validateMove(b, [
        placed(tile(2), CENTER.row, CENTER.col + 1),
        placed(tile(2), CENTER.row, CENTER.col + 3),
      ], false);
      expect(result.valid).toBe(true);
    });

    test("scores vertical segment when extending above center", () => {
      const result = validateMove(board, [placed(tile(5), CENTER.row - 1, CENTER.col)], false);
      expect(result.valid).toBe(true);
      if (result.valid) expect(result.score).toBe(10);
    });
  });

  describe("edge cases", () => {
    test("invalid: zero tiles", () => {
      expect(validateMove(board, [], true).valid).toBe(false);
    });

    test("invalid: more than 5 tiles", () => {
      const result = validateMove(board, [
        placed(tile(1), CENTER.row, CENTER.col),
        placed(tile(1), CENTER.row, CENTER.col + 1),
        placed(tile(1), CENTER.row, CENTER.col + 2),
        placed(tile(1), CENTER.row, CENTER.col + 3),
        placed(tile(1), CENTER.row, CENTER.col + 4),
        placed(tile(5), CENTER.row, CENTER.col + 5),
      ], true);
      expect(result.valid).toBe(false);
    });

    test("invalid: duplicate position", () => {
      const result = validateMove(board, [
        placed(tile(2), CENTER.row, CENTER.col),
        placed(tile(3), CENTER.row, CENTER.col),
      ], true);
      expect(result.valid).toBe(false);
    });
  });
});
