import { useState } from 'react'
import type { Board as BoardType, PlacedTile, Position, Tile } from '@engine/types'
import { BOARD_ROWS, BOARD_COLS, CENTER } from '@engine/types'
import TileComponent from './Tile'
import '../styles/Board.css'

interface BoardProps {
  board: BoardType
  stagedMoves: PlacedTile[]
  selectedTile: Tile | null
  validCells: Set<string>
  recentMoves?: Set<string>
  onCellClick: (pos: Position) => void
  onStagedClick: (pos: Position) => void
  onCellDrop?: (pos: Position) => void
}

export default function Board({
  board,
  stagedMoves,
  selectedTile,
  validCells,
  recentMoves,
  onCellClick,
  onStagedClick,
  onCellDrop,
}: BoardProps) {
  const [dragOverKey, setDragOverKey] = useState<string | null>(null)

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
            const isDragOver = dragOverKey === key && isValid && !placedTile && !stagedTile

            return (
              <div
                key={key}
                className={[
                  'cell',
                  isCenter && !stagedTile && !placedTile ? 'cell--center' : '',
                  isValid && !selectedTile ? 'cell--valid' : '',
                  isClickable ? 'cell--clickable' : '',
                  stagedTile ? 'cell--staged' : '',
                  isDragOver ? 'cell--drag-over' : '',
                ].join(' ')}
                onClick={() => {
                  if (stagedTile) {
                    onStagedClick(pos)
                  } else if (!placedTile) {
                    onCellClick(pos)
                  }
                }}
                onDragOver={(e) => {
                  if (onCellDrop && isValid && !placedTile && !stagedTile) {
                    e.preventDefault()
                    setDragOverKey(key)
                  }
                }}
                onDragLeave={() => setDragOverKey(null)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOverKey(null)
                  if (!placedTile && !stagedTile) onCellDrop?.(pos)
                }}
              >
                {placedTile && (
                  <TileComponent tile={placedTile} state={recentMoves?.has(key) ? 'recent' : 'placed'} />
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
