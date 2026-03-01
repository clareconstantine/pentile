# CLAUDE.md — Pentile Context File
*Drop this into a new chat to restore full context instantly.*

---

## What is this?
**Pentile** is a web + mobile implementation of the board game **Quinto** — a tile-placement game where all contiguous segments must sum to a multiple of 5. Built by a developer with 13 years experience (Ruby on Rails, JavaScript, React) who is using this as a learning project for React Native / Expo mobile development.

---

## Game Rules (Quinto)
- **Board:** 13 rows × 17 columns. Center square is row 6, col 8.
- **Tiles:** 90 tiles, values 0–9. Distribution: 0×7, 1×6, 2×6, 3×7, 4×10, 5×6, 6×10, 7×14, 8×12, 9×12.
- **Hand size:** 5 tiles.
- **Turn:** Place 1–5 tiles in a straight line (same row OR same column). At least one tile must touch a previously played tile.
- **The core rule:** Every contiguous horizontal or vertical segment of 2+ tiles must sum to a multiple of 5. This is checked after every placement in all directions (like a crossword — both across and down must be valid).
- **Segment max:** No contiguous segment may ever exceed 5 tiles. (Gaps between segments on the same board row/col are fine — the limit is on *contiguous* runs.)
- **Gaps:** Within a single turn's placement, gaps are only allowed if an existing board tile fills them. Empty gaps are illegal.
- **First move:** Must cover the center square. The placed tiles must already sum to a multiple of 5.
- **Scoring:** Score the sum of every contiguous segment your tiles touch (both directions). A lone tile with no neighbors scores its own value if it's a multiple of 5 (e.g. 0 or 5), otherwise the move is invalid.
- **Skipping:** If you can't play, you lose your turn. If all players skip consecutively, the game ends.
- **End of game:** When the bag and all hands are empty, OR all players skip consecutively. End-of-game penalty: subtract the sum of your remaining hand tiles from your score.
- **Winner:** Highest score wins.

---

## Tech Stack & Architecture

### Three-layer mental model:
```
[ Game Engine ]   pure TypeScript, no UI, fully tested (src/)
      ↓
[ UI Layer ]      React web (web/src/) or React Native mobile (app/ + components/)
      ↓
[ Network Layer ] Rails + Action Cable — future, multiplayer only
```

### Key principle: the UI layer is intentionally thin.
Components just render `GameState` and call `takeTurn()` / `skipTurn()`. All logic lives in the engine. The engine has zero framework dependencies — same code runs in web, mobile, and tests.

### File structure:
```
pentile/
├── src/                    # Game engine — shared everywhere
│   ├── types.ts            # All types and constants
│   ├── board.ts            # Board ops + segment extraction
│   ├── validation.ts       # validateMove(), validatePartialMove()
│   ├── gameState.ts        # createGame(), takeTurn(), skipTurn(), getWinner()
│   └── ai.ts               # findBestMove() — easy + medium difficulty
│
├── web/src/                # React web app (Vite + TypeScript)
│   ├── App.tsx             # Routes between 'setup' and 'game' screens
│   ├── main.tsx
│   ├── index.css           # Global design tokens (CSS vars) + fonts
│   ├── App.css             # Vite boilerplate — safe to delete
│   ├── components/
│   │   ├── SetupScreen.tsx # Player config (name, human/easy/medium)
│   │   ├── GameScreen.tsx  # Main game loop, AI turn handler, staged moves
│   │   ├── Board.tsx       # 13×17 grid, renders placed + staged tiles
│   │   ├── Hand.tsx        # Current player's 5-tile hand
│   │   └── Tile.tsx        # Single tile (placed/staged/hand/selected states)
│   └── styles/             # Per-component CSS files
│
├── app/                    # Expo React Native (future)
├── backend/                # Rails API (future — multiplayer)
├── notes.md                # Running to-do list (see below)
└── README.md               # High-level overview for humans
```

### Design system (CSS vars in index.css):
- `--navy` / `--navy-mid` / `--navy-light` — background layers
- `--cream` / `--cream-dark` — tile and text colors
- `--gold` / `--gold-light` — highlights, active state, title
- `--teal` / `--teal-light` — staged tiles, AI badge, clickable cells
- `--cell-size: 42px`, `--tile-size: 36px`
- Fonts: Bebas Neue (display/titles), DM Mono (UI/body)

---

## Current State
The web app is **fully working**: setup screen, game loop, human turns, AI turns (easy + medium), staged move preview, confirm/skip, scoring, end-of-game detection, win screen. Tests exist for the engine (`validation.test.ts`, `gameState.test.ts`, `ai.test.ts`).

The `@engine/` path alias points to `src/` — imported as `@engine/types`, `@engine/gameState`, etc.

---

## To-Do (see notes.md for full list)
- **In progress:** Menu button confirmation dialog — currently quits immediately, should confirm before calling `onReturnToMenu()`
- Remaining tiles counter in the UI
- Clearer active player indicator
- AI hard mode (minimax or MCTS)
- Eventually: Expo mobile port, then Rails multiplayer backend
