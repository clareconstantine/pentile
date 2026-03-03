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
│   ├── board.ts            # Board ops, segment extraction, getValidPlacementCells()
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
├── App.tsx                 # Expo entry — SafeAreaProvider + screen routing
├── app.json                # Expo config — orientation: landscape
├── babel.config.js         # module-resolver for @engine alias (Metro)
├── constants/
│   └── design.ts           # Design tokens (colors, sizes) — RN equiv of CSS vars
├── components/             # React Native components (mirror of web/src/components/)
│   ├── Tile.tsx
│   ├── Hand.tsx
│   ├── Board.tsx           # Nested ScrollViews, cell highlights via backgroundColor
│   ├── SetupScreen.tsx
│   └── GameScreen.tsx      # Logic identical to web version
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
- Cell highlight hierarchy: `.cell--valid` (20% teal) → `.cell--clickable` (30% teal) → `.cell--clickable:hover` (45% teal)

---

## Current State
The web app is **fully working**: setup screen, game loop, human turns, AI turns (easy + medium), staged move preview, confirm/skip, scoring, end-of-game detection, win screen. Tests exist for the engine (`validation.test.ts`, `gameState.test.ts`, `ai.test.ts`).

The **Expo mobile app is also working** and tested on a real device via Expo Go (SDK 54). All 5 components are ported. Safe area insets handled via `react-native-safe-area-context`.

The `@engine/` path alias points to `src/` — configured in both `babel.config.js` (Metro, runtime) and `tsconfig.json` (TypeScript, editor). Imported as `@engine/types`, `@engine/gameState`, etc.

### Key implementation details:
- **AI turn handler** uses a `useRef` flag (`aiThinking`) instead of `useState` to avoid re-render loops. Effect depends on `[isAITurn, gameState.currentPlayerIndex]` — the `currentPlayerIndex` dependency is critical for multi-AI games where `isAITurn` never becomes false. Delay is `AI_THINKING_DELAY_MS = 1200`.
- **AI animation** — after an AI turn, `aiRecentMoves: Set<string>` highlights placed tiles gold for 1500ms. `scoreFlash` shows "+N" briefly on the score card. Both cleared by a `useRef` timer (`aiHighlightTimer`).
- **`isFirstMove`** — determined by `board.every(row => row.every(cell => cell === null))` throughout (engine, AI, and both UI layers). NOT `turnNumber === 0` — turns can be skipped on an empty board.
- **Move preview** — `validateMove` is called live in `GameScreen` on every staged move change. Score shown next to Confirm button; Confirm is disabled until move is fully valid.
- **Valid placement highlighting** — `getValidPlacementCells()` in `board.ts` returns a `Set<string>` of `"row,col"` keys. Accounts for: adjacency to existing/staged tiles, 6-tile overflow prevention, committed direction (once 2+ tiles staged), first-move center-only rule. Passed to `Board` as `validCells` prop.
- **Tiles remaining** — shown in header, turns gold when ≤ 10 tiles left.
- **Quit confirmation** — Menu button toggles inline confirm UI (`confirmingQuit` state) before calling `onReturnToMenu`.
- **Directions modal** — `constants/directions.ts` is the single source of truth for rule text, imported by both web and mobile `SetupScreen`. Uses `@constants/` alias (configured in Vite, web tsconfig, root tsconfig, and babel.config.js).
- **Medium AI performance** — `findLineMovesForHand` in `ai.ts` limits candidate cells to within 4 positions of an occupied cell, preventing combinatorial explosion in the early game.

---

## To-Do (see notes.md for full list)
- AI hard mode (minimax or MCTS)
- Eventually: Rails multiplayer backend
