import type { Tile } from '@engine/types'
import TileComponent from './Tile'
import '../styles/Hand.css'

interface HandProps {
  tiles: Tile[]
  selectedTile: Tile | null
  onTileSelect: (tile: Tile) => void
}

export default function Hand({ tiles, selectedTile, onTileSelect }: HandProps) {
  return (
    <div className="hand">
      {tiles.map(tile => (
        <TileComponent
          key={tile.id}
          tile={tile}
          state={selectedTile?.id === tile.id ? 'selected' : 'hand'}
          onClick={() => onTileSelect(tile)}
        />
      ))}
      {Array.from({ length: Math.max(0, 5 - tiles.length) }, (_, i) => (
        <div key={`empty-${i}`} className="tile tile--empty" />
      ))}
    </div>
  )
}
