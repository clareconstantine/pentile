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
- **Recent moves highlight** — `recentMoves: Set<string>` (renamed from `aiRecentMoves`) highlights last-played tiles gold. For AI moves: cleared after 1500ms via `aiHighlightTimer`. For human moves in multi-human games: set in `handleConfirm`, stored in `pendingHandoffMoves` ref, applied in `handleHandoffReady`, cleared after 1500ms. `scoreFlash` shows "+N" briefly on the score card.
- **`isFirstMove`** — determined by `isBoardEmpty(board)` (exported from `board.ts`). NOT `turnNumber === 0` — turns can be skipped on an empty board.
- **Move preview** — `validateMove` is called live in `GameScreen` on every staged move change. Score shown next to Confirm button; Confirm is disabled until move is fully valid.
- **Valid placement highlighting** — `getValidPlacementCells()` in `board.ts` returns a `Set<string>` of `"row,col"` keys. Accounts for: adjacency to existing/staged tiles, 6-tile overflow prevention, committed direction (once 2+ tiles staged), same-row-or-column + no-gap constraint (1 tile staged), first-move center-only rule. Uses `hasGapInRow`/`hasGapInCol` inner helpers (also used for the committed-direction gap checks). Passed to `Board` as `validCells` prop. Empty during handoff and AI turns.
- **Tiles remaining** — shown in header as "X tiles in bag" / "Bag empty" (correct pluralisation). Turns gold when ≤ 10 tiles left.
- **Empty hand auto-skip** — `isEmptyHandTurn` flag; useEffect auto-calls `skipTurn` after 1200ms with animated dots indicator. Prevents stuck human players when bag is empty but others still have tiles.
- **Menu** — `menuState: 'closed' | 'menu' | 'confirming'` replaces old `confirmingQuit` bool. Menu shows Light/Dark toggle, Challenge mode toggle, and Quit (which leads to confirm step).
- **Theme** — `isDark` + `onToggleTheme` passed from `App` to `GameScreen` and `SetupScreen`. Persisted in `localStorage` as `pentile-theme`.
- **Pass-the-device handoff** — `multipleHumans` flag; `handoffPending` state set by useEffect when `turnNumber > 0` and it's a human's turn. Shows handoff footer (board visible, hand hidden) until incoming player taps Ready. `handleHandoffReady` applies `pendingHandoffMoves` to `recentMoves` then clears after 1500ms.
- **Auto-rename on type change** — `handleTypeChange` in `SetupScreen` auto-renames "CPU"→"Player N" (and back) when switching player type, only if name is still the default.
- **Drag and drop** (web only) — `Tile` accepts `onDragStart`/`onDragEnd`; `Hand` passes `onTileDragStart`/`onTileDragEnd`; `Board` has `onCellDrop` + `dragOverKey` state for hover highlight. `GameScreen` sets `selectedTile` on drag start; `onCellDrop={handleCellClick}` reuses placement logic.
- **Easy AI** — now uses `findDecentMove`: finds all valid moves, filters to those scoring ≥ half the max, picks randomly. Better than random but not optimal. `findFirstValidMove` removed.
- **Learning mode** — toggled on setup screen; stored in `GameOptions` passed via `onStart`. Computes `turnMaxScore` via `findBestMove(gameState, 'medium')` once per turn start. Shows `X% of potential points` badge live in move preview (gold ≥ 100%, teal ≥ 70%, dim < 70%).
- **Challenge mode** — toggled in in-game Menu; persisted in `localStorage` as `pentile-challenge`. After confirming a move, appends `· X% of potential` to the score message. Suppressed when learning mode is also on.
- **Directions modal** — `constants/directions.ts` is the single source of truth for rule text, imported by both web and mobile `SetupScreen`. Uses `@constants/` alias (configured in Vite, web tsconfig, root tsconfig, and babel.config.js).
- **Medium AI performance** — `findLineMovesForHand` in `ai.ts` limits candidate cells to within 4 positions of an occupied cell, preventing combinatorial explosion in the early game. Uses a `linePos(line, i)` helper to convert a `Line` + index to a `Position`.
- **Endgame phase** — `isEndgame = phase === 'playing' && tileBag.length === 0`. When true: a teal banner appears below the header; the first time ever, a one-time modal explains the hand-penalty rule (web: `localStorage['pentile-endgame-seen']`; mobile: module-level `endgameModalShown` flag). End screen shows penalty breakdown: "Alice: 45 − 7 = 38" when a player has tiles remaining.
- **No valid moves detection** — `hasValidMoves` state computed via `findBestMove(gameState, 'medium')` at the start of every human turn (replaces the learning-mode-only effect). When `false`: "No valid moves" appears in the move preview slot and Skip becomes the primary (gold) button.

### Web/mobile divergence
Web and mobile are largely at parity. Planned mobile-specific divergences going forward:
- Mobile will be human vs CPU only (no pass-and-play, no players 3/4)
- Mobile bottom banner will be redesigned (vertical hand column on left)

---

## App Store Launch

### EAS / Build config
- EAS configured: `eas.json` in root, project linked to `@clareconstantine/pentile`
- iOS bundle identifier: `com.clareconstantine.pentile`
- Apple Developer Program active
- Standalone build tested on device via `eas build --profile preview --platform ios` ✓
- Developer mode enabled on test iPhone
- Full checklist in `app-store-launch.md`

### App contact / accounts
- App email: `pentileapp@gmail.com`
- Apple ID used for enrollment: `clare12@stanford.edu`

### Privacy policy
- Hosted at: `https://clareconstantine.github.io/pentile/privacy-policy`
- Source: `privacy-policy.md` in the root of the GitHub repo
- Content: no data collected, no tracking, contact pentileapp@gmail.com

---

## To-Do (see notes.md for full list)
- AI hard mode (minimax or MCTS)
- Eventually: Rails multiplayer backend
