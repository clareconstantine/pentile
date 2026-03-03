# Pentile — Running To-Do

## In Progress

## UI / UX
- Accessibility
  - keyboard nav

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
- A littlemore gamification in general? but not too much. What else is common?

## Known Issues

## User Feedback
- Quick game with fewer tiles and smaller board
- desktop: drag and drop tiles
- make easy mode a little bit harder?
- a setting where we calculate the player's maximum possible points for that turn and show the % of their max possible points they scored. could be solo mode? or a feature that's just always toggleable
- Number of tiles left in bag:
  - Not clear what "X tiles left" means
  - when 1 left, tiles is still plural
  - Near the end of the game, this can be 0 but the game continues
- End of game
  - not clear why play continues when player has no tiles, if the ai still has tiles in their hand. player just has to click Skip
    - maybe would help to have a visualization of the opponents' hands, or have turn skipped automatically, or animation that says "opponent finishing..." or something
  - not clear why it says "0 tiles left" when player has tiles in hand
- visual indicator to make it more clear you can scroll
- keep opponents' pervious move yellow longer/the whole next turn - if you are zoomed in (especailly relevant on mobile) you might not see that part of the board

## To Test
- Multiple human player experience, especially with turns and hands and things

## Future project ideas
- Lighthouse - like the game light up
- Binairo
- any of the logic games on the puzzles website
