import type { Tile } from '@engine/types'
import './Tile.css'

interface TileProps {
  tile: Tile
  state: 'placed' | 'staged' | 'hand' | 'selected'
  onClick?: () => void
}

export default function TileComponent({ tile, state, onClick }: TileProps) {
  return (
    <div
      className={`tile tile--${state}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span className="tile-value">{tile.value}</span>
    </div>
  )
}
