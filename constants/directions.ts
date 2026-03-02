export const DIRECTIONS = [
  {
    heading: 'The board',
    body: '13 × 17 grid. The first tile must cover the centre square.',
  },
  {
    heading: 'Your turn',
    body: 'Place 1–5 tiles in a straight line — all in the same row or all in the same column. At least one tile must touch a tile already on the board.',
  },
  {
    heading: 'The rule',
    body: 'Every contiguous run of 2 or more tiles — horizontally and vertically — must sum to a multiple of 5. A run can never be longer than 5 tiles.',
  },
  {
    heading: 'Scoring',
    body: 'Score the sum of every run your tiles touch, in both directions. A single tile with no neighbours is only valid if its value is 0 or 5.',
  },
  {
    heading: 'End of game',
    body: 'The game ends when all tiles have been played, or when no player can make a valid move. Subtract the sum of your remaining tiles from your score. Highest score wins.',
  },
]
