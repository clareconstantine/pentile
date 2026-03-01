# Pentile
Based on the board game Quinto

## The Tech Stack
The game engine (`src/`) is pure TypeScript — no framework dependencies at all. It's just functions and types that model the game. This is intentional: it means the exact same code runs in our web app, your Expo app, and our test suite. The engine doesn't know or care what renders it.

The **web version** will be a React app (plain Vite + React + TypeScript). This is your fast iteration environment — hot reload in the browser, easy to debug, no mobile toolchain involved. Once the game feels right here, porting to Expo is mostly a matter of swapping HTML/CSS primitives for React Native primitives (`div` → `View`, `span` → `Text`, CSS → StyleSheet).

The **mobile version** will be Expo (React Native). This shares the game engine entirely and reuses most component logic — only the rendering layer changes.

Eventually, the **multiplayer backend** will be a Rails API with Action Cable for real-time WebSocket communication. Both the web and mobile clients will talk to the same backend.

## The Final Project Structure
```
pentile/
│
├── src/                        # Pure TypeScript game engine — shared everywhere
│   ├── types.ts
│   ├── board.ts
│   ├── validation.ts
│   ├── gameState.ts
│   └── ai.ts                   # (coming soon)
│
├── web/                        # React web app (Vite)
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
│           ├── Board.tsx
│           ├── Tile.tsx
│           ├── Hand.tsx
│           └── GameScreen.tsx
│
├── app/                        # Expo React Native app
│   ├── index.tsx               # Entry point (Expo Router)
│   └── game.tsx                # Main game screen
│
├── components/                 # React Native components (mobile)
│   ├── Board.tsx
│   ├── Tile.tsx
│   ├── Hand.tsx
│   └── GameScreen.tsx
│
├── backend/                    # Rails API (future — multiplayer)
│   └── ...
│
├── package.json                # Expo is the root package
└── web/package.json            # Web app has its own package
```

The key mental model is three layers:
```
[ Game Engine ]  ← pure TS, no UI, fully tested
      ↓
[ UI Layer ]     ← React (web) or React Native (mobile), reads/writes GameState
      ↓
[ Network Layer ]← Rails + Action Cable (future, multiplayer only)
```
The UI layer is intentionally thin — components just render `GameState` and call `takeTurn()` / `skipTurn()`. All the interesting logic lives in the engine.
