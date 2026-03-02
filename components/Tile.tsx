import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Tile } from '@engine/types'
import { colors, sizes } from '../constants/design'

interface TileProps {
  tile: Tile
  state: 'placed' | 'staged' | 'hand' | 'selected'
  onPress?: () => void
}

export default function TileComponent({ tile, state, onPress }: TileProps) {
  const tileStyle = [
    styles.tile,
    state === 'placed'   && styles.placed,
    state === 'staged'   && styles.staged,
    state === 'hand'     && styles.hand,
    state === 'selected' && styles.selected,
  ]

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [tileStyle, pressed && styles.pressed]}>
        <Text style={styles.value}>{tile.value}</Text>
      </Pressable>
    )
  }

  return (
    <View style={tileStyle}>
      <Text style={styles.value}>{tile.value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    width: sizes.tile,
    height: sizes.tile,
    borderRadius: sizes.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placed: {
    backgroundColor: colors.cream,
  },
  staged: {
    backgroundColor: colors.teal,
  },
  hand: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.creamDark,
  },
  selected: {
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderColor: colors.goldLight,
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.navy,
  },
})
