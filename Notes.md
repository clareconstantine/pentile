# Pentile — Running To-Do

## In Progress

## UI / UX
- Accessibility
  - keyboard nav
- Dark/light/device theme toggle — add "device" mode (follows OS preference) on both web and mobile

## Mobile
- Simplify setup screen: human vs CPU only, no pass-and-play, no players 3/4 — just select CPU difficulty
- Rename AI difficulties to "Easy" and "Hard" across web and mobile (was easy/medium)
- Fix scorecard active turn border (gold border not visible)
- Redesign bottom banner: hand as vertical column on left side; fix message overflow off right edge
- Fix font inconsistencies across mobile components
- App icon: 5 is too high, tile is too large — tweak in Canva and re-export

## New Features
- Quick game mode - smaller board and fewer tiles

## Infrastructure
- Do we have enough tests? - maybe some jest tests?
- Rails multiplayer backend?
- Licensing - how do I protect my work?
- Marketing - how will people find it? (especially if they search for quinto)
- How/when to submit to the app store
- Add a paywall after a certain number of games?

## AI
- **Hard mode** — smarter AI difficulty beyond easy/medium (minimax or Monte Carlo tree search)

## User Accounts
- Be able to log in
- Display a player's highest score overall, and their highest scoring turn. At the end of a game, show them stats like highest scoring turn from that game?
- Badges? For beating another person, each level of the ai, etc. For playing 5 tiles of the same number in one turn. For only playing 0s in one turn, etc.
- A little more gamification in general? but not too much. What else is common?

## Known Issues

## User Feedback
- Quick game with fewer tiles and smaller board
- make easy mode a little bit harder?
- visual indicator to make it more clear you can scroll
- keep opponents' pervious move yellow longer/the whole next turn - if you are zoomed in (especailly relevant on mobile) you might not see that part of the board
- async multiplayer mode

## To Test
- Multiple human player experience, especially with turns and hands and things

## Mobile Development Workflow

### Day-to-day development
Use Expo Go — run `npx expo start`, scan QR, changes hot-reload instantly. This is the equivalent of `localhost` in web dev. No rebuild needed.

### When you need a new standalone build (`eas build`)
Only required when changing things baked into the native binary:
- `app.json` config (icons, splash, permissions, bundle ID, etc.)
- Adding a native library (one with native code, not pure JS)
- Upgrading Expo SDK

Run `eas build --profile preview --platform ios`, download the `.ipa`, reinstall on device.

### Shipping updates to users
- **New build via EAS** — full rebuild, goes through App Store review (1–3 days). Required for native changes.
- **OTA update via EAS Update** — pushes JS/asset changes instantly, no App Store review. Users get it next time they open the app. Works for everything pure JS.

### Practical note for Pentile
Everything is pure JS (no custom native modules), so `eas build` is rarely needed. Use Expo Go for development; only build when preparing a release candidate or App Store submission.

---

## Future project ideas
- Lighthouse - like the game light up
- Binairo
- any of the logic games on the puzzles website
- ESTHP revival
