# Pentile
Based on the board game Quinto

## Current State
- **Web app** — fully working (Vite + React + TypeScript)
- **Mobile app** — fully working (Expo + React Native), tested on device via Expo Go; App Store submission in progress
- **Multiplayer backend** — not started yet

## The Tech Stack
The game engine (`src/`) is pure TypeScript — no framework dependencies at all. It's just functions and types that model the game. This is intentional: it means the exact same code runs in the web app, the Expo app, and the test suite. The engine doesn't know or care what renders it.

The **web version** is a React app (Vite + React + TypeScript). Fast iteration environment — hot reload in the browser, easy to debug.

The **mobile version** is Expo (React Native), running in landscape orientation. It shares the game engine entirely and mirrors the web component structure — only the rendering layer differs (`div` → `View`, CSS → `StyleSheet`).

Eventually, the **multiplayer backend** will be a Rails API with Action Cable for real-time WebSocket communication.

## Project Structure
```
pentile/
│
├── src/                        # Pure TypeScript game engine — shared everywhere
│   ├── types.ts                # All types and constants
│   ├── board.ts                # Board ops, getValidPlacementCells()
│   ├── validation.ts           # validateMove(), validatePartialMove()
│   ├── gameState.ts            # createGame(), takeTurn(), skipTurn()
│   └── ai.ts                   # findBestMove() — easy + medium difficulty
│
├── web/                        # React web app (Vite)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css           # Design tokens (CSS vars) + fonts
│       └── components/
│           ├── SetupScreen.tsx
│           ├── GameScreen.tsx
│           ├── Board.tsx
│           ├── Hand.tsx
│           └── Tile.tsx
│
├── App.tsx                     # Expo entry point — screen routing + safe area
├── app.json                    # Expo config (landscape orientation)
├── babel.config.js             # @engine alias for Metro bundler
├── constants/
│   └── design.ts               # Design tokens for React Native (colors, sizes)
├── components/                 # React Native components
│   ├── SetupScreen.tsx
│   ├── GameScreen.tsx
│   ├── Board.tsx
│   ├── Hand.tsx
│   └── Tile.tsx
│
├── backend/                    # Rails API (future — multiplayer)
│
└── package.json                # Expo is the root package
```

## Architecture
```
[ Game Engine ]  ← pure TS, no UI, fully tested
      ↓
[ UI Layer ]     ← React (web) or React Native (mobile)
      ↓
[ Network Layer ]← Rails + Action Cable (future, multiplayer only)
```

The UI layer is intentionally thin — components just render `GameState` and call `takeTurn()` / `skipTurn()`. All the interesting logic lives in the engine.

## Running the project

**Web:**
```bash
cd web && npm run dev
```

**Mobile:**
```bash
npx expo start
# scan QR with Expo Go, or press w for browser
```

**Standalone iOS build (requires active Apple Developer account):**
```bash
eas build --profile preview --platform ios
```

**Tests (engine only):**
```bash
npm test
```
