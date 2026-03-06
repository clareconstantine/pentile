import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Tile } from '@engine/types'
import { sizes } from '../constants/design'
import type { Colors } from '../constants/design'
import { useColors } from '../constants/ThemeContext'

interface TileProps {
  tile: Tile
  state: 'placed' | 'staged' | 'hand' | 'selected' | 'recent'
  onPress?: () => void
}

export default function TileComponent({ tile, state, onPress }: TileProps) {
  const colors = useColors()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const tileStyle = [
    styles.tile,
    state === 'placed'   && styles.placed,
    state === 'staged'   && styles.staged,
    state === 'hand'     && styles.hand,
    state === 'selected' && styles.selected,
    state === 'recent'   && styles.recent,
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

function makeStyles(colors: Colors) { return StyleSheet.create({
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
  recent: {
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
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
}) }
