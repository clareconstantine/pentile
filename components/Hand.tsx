import { StyleSheet, View } from 'react-native'
import type { Tile } from '@engine/types'
import { HAND_SIZE } from '@engine/types'
import TileComponent from './Tile'
import { colors, sizes } from '../constants/design'

interface HandProps {
  tiles: Tile[]
  selectedTile: Tile | null
  onTileSelect: (tile: Tile) => void
}

export default function Hand({ tiles, selectedTile, onTileSelect }: HandProps) {
  return (
    <View style={styles.hand}>
      {tiles.map(tile => (
        <TileComponent
          key={tile.id}
          tile={tile}
          state={selectedTile?.id === tile.id ? 'selected' : 'hand'}
          onPress={() => onTileSelect(tile)}
        />
      ))}
      {Array.from({ length: Math.max(0, HAND_SIZE - tiles.length) }, (_, i) => (
        <View key={`empty-${i}`} style={styles.emptySlot} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  hand: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    width: sizes.tile,
    height: sizes.tile,
    borderRadius: sizes.borderRadius,
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderStyle: 'dashed',
  },
})
