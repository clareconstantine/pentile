import type { Board as BoardType, PlacedTile, Position, Tile } from '@engine/types'
import { BOARD_ROWS, BOARD_COLS, CENTER } from '@engine/types'
import TileComponent from './Tile'
import '../styles/Board.css'

interface BoardProps {
  board: BoardType
  stagedMoves: PlacedTile[]
  selectedTile: Tile | null
  validCells: Set<string>
  onCellClick: (pos: Position) => void
  onStagedClick: (pos: Position) => void
}

export default function Board({
  board,
  stagedMoves,
  selectedTile,
  validCells,
  onCellClick,
  onStagedClick,
}: BoardProps) {
  const stagedMap = new Map(
    stagedMoves.map(m => [`${m.position.row},${m.position.col}`, m.tile])
  )

  return (
    <div className="board-wrapper">
      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${BOARD_COLS}, var(--cell-size))`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, var(--cell-size))`,
        }}
      >
        {Array.from({ length: BOARD_ROWS }, (_, row) =>
          Array.from({ length: BOARD_COLS }, (_, col) => {
            const pos: Position = { row, col }
            const key = `${row},${col}`
            const placedTile = board[row][col]
            const stagedTile = stagedMap.get(key)
            const isCenter = row === CENTER.row && col === CENTER.col
            const isValid = validCells?.has(key) ?? false
            const isClickable = isValid && !!selectedTile

            return (
              <div
                key={key}
                className={[
                  'cell',
                  isCenter && !stagedTile && !placedTile ? 'cell--center' : '',
                  isValid && !selectedTile ? 'cell--valid' : '',
                  isClickable ? 'cell--clickable' : '',
                  stagedTile ? 'cell--staged' : '',
                ].join(' ')}
                onClick={() => {
                  if (stagedTile) {
                    onStagedClick(pos)
                  } else if (!placedTile) {
                    onCellClick(pos)
                  }
                }}
              >
                {placedTile && (
                  <TileComponent tile={placedTile} state="placed" />
                )}
                {!placedTile && stagedTile && (
                  <TileComponent tile={stagedTile} state="staged" />
                )}
                {!placedTile && !stagedTile && isCenter && (
                  <div className="center-marker" />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
