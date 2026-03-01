# Pentile — Running To-Do

## In Progress

## UI / UX
- [ ] **Remaining tiles counter** — display how many tiles are left in the bag somewhere visible (header?)
- [ ] **Clearer active player indicator** — make it more obvious whose turn it is (beyond the score card highlight)
- [ ] **Thinking time** slightly longer thinking time - it feels pretty instantaneous right now on easy mode
- [ ] **AI tuen animation** make it easier to see what tiles the AI placed by highlighting them for a few seconds and animating the score number change
- [ ] **Current move points** During the human player's turn, show how many points their current tiles would earn them (and maybe also whether it's a valid complete move?). And after you confirm, make it more clear how many points you scored that turn (at least briefly)
- [ ] **Show valid tile placements** We currently highlight empty spaces as teal. Can we not highlight spaces that are not valid places to put a tile (regardless of tile number)? So don't highlight spaces that are not adjacent to another tile (unless it's turn 1 and no tiles are placed yet - then highlight the middle square). Don't highlight spaces that would create a segment of 6 or more tiles.

## AI
- [ ] **Hard mode** — smarter AI difficulty beyond easy/medium (minimax or Monte Carlo tree search)

## Known Issues
<!-- add bugs here as they come up -->

## Completed
- **Menu button confirmation** — currently quits immediately; should show a confirm dialog ("Quit game?" / Cancel + Quit) before returning to setup screen
