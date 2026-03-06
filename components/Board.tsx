import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import type { Board as BoardType, PlacedTile, Position, Tile } from '@engine/types'
import { BOARD_ROWS, BOARD_COLS, CENTER } from '@engine/types'
import TileComponent from './Tile'
import { sizes } from '../constants/design'
import type { Colors } from '../constants/design'
import { useColors } from '../constants/ThemeContext'

interface BoardProps {
  board: BoardType
  stagedMoves: PlacedTile[]
  selectedTile: Tile | null
  validCells: Set<string>
  recentMoves?: Set<string>
  onCellClick: (pos: Position) => void
  onStagedClick: (pos: Position) => void
}

export default function Board({
  board,
  stagedMoves,
  selectedTile,
  validCells,
  recentMoves,
  onCellClick,
  onStagedClick,
}: BoardProps) {
  const colors = useColors()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const stagedMap = new Map(
    stagedMoves.map(m => [`${m.position.row},${m.position.col}`, m.tile])
  )

  return (
    <ScrollView horizontal style={styles.outerScroll}>
      <ScrollView nestedScrollEnabled style={styles.innerScroll}>
        <View style={styles.board}>
          {Array.from({ length: BOARD_ROWS }, (_, row) => (
            <View key={row} style={styles.row}>
              {Array.from({ length: BOARD_COLS }, (_, col) => {
                const pos: Position = { row, col }
                const key = `${row},${col}`
                const placedTile = board[row][col]
                const stagedTile = stagedMap.get(key)
                const isCenter = row === CENTER.row && col === CENTER.col
                const isValid = validCells?.has(key) ?? false
                const isClickable = isValid && !!selectedTile

                const cellBg = (() => {
                  if (stagedTile) return 'transparent'
                  if (isClickable) return 'rgba(44,180,180,0.30)'
                  if (isValid) return 'rgba(44,180,180,0.20)'
                  if (isCenter && !placedTile) return colors.navyLight
                  return colors.navyMid
                })()

                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [
                      styles.cell,
                      { backgroundColor: cellBg },
                      isClickable && pressed && { backgroundColor: 'rgba(44,180,180,0.45)' },
                    ]}
                    onPress={() => {
                      if (stagedTile) {
                        onStagedClick(pos)
                      } else if (!placedTile) {
                        onCellClick(pos)
                      }
                    }}
                  >
                    {placedTile && (
                      <TileComponent tile={placedTile} state={recentMoves?.has(key) ? 'recent' : 'placed'} />
                    )}
                    {!placedTile && stagedTile && (
                      <TileComponent tile={stagedTile} state="staged" />
                    )}
                    {!placedTile && !stagedTile && isCenter && (
                      <View style={styles.centerMarker} />
                    )}
                  </Pressable>
                )
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScrollView>
  )
}

function makeStyles(colors: Colors) { return StyleSheet.create({
  outerScroll: {
    flex: 1,
  },
  innerScroll: {
    flex: 1,
  },
  board: {
    flexDirection: 'column',
    gap: 1,
    padding: 4,
    backgroundColor: colors.navy,
    borderWidth: 2,
    borderColor: colors.navyLight,
  },
  row: {
    flexDirection: 'row',
    gap: 1,
  },
  cell: {
    width: sizes.cell,
    height: sizes.cell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gold,
    opacity: 0.6,
  },
}) }
