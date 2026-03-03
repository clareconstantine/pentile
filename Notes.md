# Pentile — Running To-Do

## In Progress

## UI / UX
- Accessibility
  - keyboard nav
- Setup screen: name input field not obviously editable — add a subtle border/underline on hover/focus

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
- when you select multiple human players, the others are labeled AI not player 2, etc. it does let a human play, but we should make it more clear whose turn it is - maybe popup to pass the game to player 2, they click ok and then see their hand and the previous move in gold

## User Feedback
- Quick game with fewer tiles and smaller board
- desktop: drag and drop tiles
- make easy mode a little bit harder?
- a setting where we calculate the player's maximum possible points for that turn and show the % of their max possible points they scored. could be solo mode? or a feature that's just always toggleable
- visual indicator to make it more clear you can scroll
- keep opponents' pervious move yellow longer/the whole next turn - if you are zoomed in (especailly relevant on mobile) you might not see that part of the board
- async multiplayer mode

## To Test
- Multiple human player experience, especially with turns and hands and things

## Future project ideas
- Lighthouse - like the game light up
- Binairo
- any of the logic games on the puzzles website
