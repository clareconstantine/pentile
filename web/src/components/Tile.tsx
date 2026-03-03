import type { Tile } from '@engine/types'
import '../styles/Tile.css'

interface TileProps {
  tile: Tile
  state: 'placed' | 'staged' | 'hand' | 'selected' | 'recent'
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragEnd?: () => void
}

export default function TileComponent({ tile, state, onClick, onDragStart, onDragEnd }: TileProps) {
  return (
    <div
      className={`tile tile--${state}`}
      onClick={onClick}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className="tile-value">{tile.value}</span>
    </div>
  )
}
