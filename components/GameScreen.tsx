import { useState, useCallback, useEffect, useRef } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { GameState, Tile, PlacedTile, Position } from '@engine/types'
import { createGame, takeTurn, skipTurn } from '@engine/gameState'
import { validatePartialMove, validateMove } from '@engine/validation'
import { getValidPlacementCells } from '@engine/board'
import { findBestMove } from '@engine/ai'
import type { AIDifficulty } from '@engine/ai'
import Board from './Board'
import Hand from './Hand'
import { colors } from '../constants/design'

export interface PlayerConfig {
  name: string
  isAI: boolean
  difficulty?: AIDifficulty
}

interface GameScreenProps {
  playerConfigs: PlayerConfig[]
  onReturnToMenu: () => void
}

const AI_THINKING_DELAY_MS = 1200

export default function GameScreen({ playerConfigs, onReturnToMenu }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState>(() =>
    createGame({
      playerNames: playerConfigs.map(p => p.name),
      aiPlayerIndices: playerConfigs
        .map((p, i) => (p.isAI ? i : -1))
        .filter(i => i !== -1),
    })
  )
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [stagedMoves, setStagedMoves] = useState<PlacedTile[]>([])
  const [message, setMessage] = useState<string>('')
  const [confirmingQuit, setConfirmingQuit] = useState(false)
  const [aiRecentMoves, setAiRecentMoves] = useState<Set<string>>(new Set())
  const [scoreFlash, setScoreFlash] = useState<{ playerIndex: number; amount: number } | null>(null)

  const aiThinking = useRef(false)
  const aiHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emptyHandSkipping = useRef(false)

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const currentConfig = playerConfigs[gameState.currentPlayerIndex]
  const isAITurn = currentPlayer.isAI && gameState.phase === 'playing'
  const isFirstMove = gameState.board.every((row) => row.every((cell) => cell === null))
  const isEmptyHandTurn = !isAITurn && gameState.phase === 'playing' && currentPlayer.hand.length === 0

  const stagedIds = new Set(stagedMoves.map(m => m.tile.id))
  const availableHand = currentPlayer.hand.filter(t => !stagedIds.has(t.id))
  const movePreview = stagedMoves.length > 0
    ? validateMove(gameState.board, stagedMoves, isFirstMove)
    : null
  const validCells = gameState.phase === 'playing' && !isAITurn
    ? getValidPlacementCells(gameState.board, stagedMoves, isFirstMove)
    : new Set<string>()

  // ── AI turn handler ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAITurn || aiThinking.current) return

    aiThinking.current = true

    const timer = setTimeout(() => {
      try {
        const difficulty = currentConfig.difficulty ?? 'medium'
        const move = findBestMove(gameState, difficulty)

        if (!move) {
          const result = skipTurn(gameState)
          if (result.success) setGameState(result.state)
        } else {
          const result = takeTurn(gameState, move.placed)
          if (result.success) {
            setGameState(result.state)
            setMessage(
              result.state.phase === 'finished'
                ? 'Game over!'
                : `${currentPlayer.name} scored +${result.scoreEarned}!`
            )
            const positions = new Set(move.placed.map(p => `${p.position.row},${p.position.col}`))
            setAiRecentMoves(positions)
            setScoreFlash({ playerIndex: gameState.currentPlayerIndex, amount: result.scoreEarned })
            if (aiHighlightTimer.current) clearTimeout(aiHighlightTimer.current)
            aiHighlightTimer.current = setTimeout(() => {
              setAiRecentMoves(new Set())
              setScoreFlash(null)
            }, 1500)
          }
        }
      } catch (err) {
        console.error('AI error:', err)
      } finally {
        aiThinking.current = false
      }
    }, AI_THINKING_DELAY_MS)

    return () => {
      clearTimeout(timer)
      aiThinking.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAITurn, gameState.currentPlayerIndex])

  // ── Auto-skip for empty-handed human players ──────────────────────────

  useEffect(() => {
    if (!isEmptyHandTurn || emptyHandSkipping.current) return

    emptyHandSkipping.current = true

    const timer = setTimeout(() => {
      const result = skipTurn(gameState)
      if (result.success) setGameState(result.state)
      emptyHandSkipping.current = false
    }, 1200)

    return () => {
      clearTimeout(timer)
      emptyHandSkipping.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayerIndex, gameState.phase])

  // ── Human turn handlers ────────────────────────────────────────────────

  const handleTileSelect = useCallback((tile: Tile) => {
    setSelectedTile(prev => prev?.id === tile.id ? null : tile)
    setMessage('')
  }, [])

  const handleCellClick = useCallback((pos: Position) => {
    if (!selectedTile) return

    const alreadyStaged = stagedMoves.some(
      m => m.position.row === pos.row && m.position.col === pos.col
    )
    if (alreadyStaged) return

    const newStaged = [...stagedMoves, { tile: selectedTile, position: pos }]
    const preview = validatePartialMove(gameState.board, newStaged, isFirstMove)
    if (!preview.valid) {
      setMessage(preview.reason)
      return
    }

    setStagedMoves(newStaged)
    setSelectedTile(null)
    setMessage('')
  }, [selectedTile, stagedMoves, gameState])

  const handleUnstage = useCallback((pos: Position) => {
    const removed = stagedMoves.find(
      m => m.position.row === pos.row && m.position.col === pos.col
    )
    if (!removed) return
    setStagedMoves(prev => prev.filter(
      m => !(m.position.row === pos.row && m.position.col === pos.col)
    ))
    setSelectedTile(removed.tile)
  }, [stagedMoves])

  const handleConfirm = useCallback(() => {
    if (stagedMoves.length === 0) return
    const result = takeTurn(gameState, stagedMoves)
    if (!result.success) {
      setMessage(result.reason)
      return
    }
    setGameState(result.state)
    setStagedMoves([])
    setSelectedTile(null)
    setMessage(
      result.state.phase === 'finished'
        ? 'Game over!'
        : `+${result.scoreEarned} points for ${currentPlayer.name}!`
    )
  }, [gameState, stagedMoves, currentPlayer])

  const handleSkip = useCallback(() => {
    setStagedMoves([])
    setSelectedTile(null)
    const result = skipTurn(gameState)
    if (result.success) {
      setGameState(result.state)
      setMessage(`${currentPlayer.name} skipped their turn.`)
    }
  }, [gameState, currentPlayer])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PENTILE</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scores}>
          {gameState.players.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.scoreCard,
                i === gameState.currentPlayerIndex && gameState.phase === 'playing'
                  ? styles.scoreCardActive
                  : null,
              ]}
            >
              <Text style={[
                styles.playerName,
                i === gameState.currentPlayerIndex && gameState.phase === 'playing'
                  ? styles.playerNameActive
                  : null,
              ]}>
                {p.name}
                {playerConfigs[i].isAI && (
                  <Text style={styles.aiBadge}> {playerConfigs[i].difficulty ?? 'medium'}</Text>
                )}
              </Text>
              <View>
                <Text style={styles.playerScore}>{p.score}</Text>
                {scoreFlash?.playerIndex === i && (
                  <Text style={styles.scoreDelta}>+{scoreFlash.amount}</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>

        <Text style={[
          styles.tilesRemaining,
          gameState.tileBag.length <= 10 && styles.tilesRemainingLow,
        ]}>
          {gameState.tileBag.length === 0 ? 'Bag empty' : `${gameState.tileBag.length} tile${gameState.tileBag.length === 1 ? '' : 's'} in bag`}
        </Text>

        {confirmingQuit ? (
          <View style={styles.quitConfirm}>
            <Text style={styles.quitLabel}>Quit?</Text>
            <Pressable onPress={onReturnToMenu} style={[styles.btn, styles.btnDanger]}>
              <Text style={styles.btnText}>Quit</Text>
            </Pressable>
            <Pressable onPress={() => setConfirmingQuit(false)} style={[styles.btn, styles.btnGhost]}>
              <Text style={styles.btnGhostText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setConfirmingQuit(true)} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>Menu</Text>
          </Pressable>
        )}
      </View>

      {/* Board */}
      <View style={styles.boardContainer}>
        <Board
          board={gameState.board}
          stagedMoves={stagedMoves}
          selectedTile={selectedTile}
          validCells={validCells}
          recentMoves={aiRecentMoves}
          onCellClick={handleCellClick}
          onStagedClick={handleUnstage}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {gameState.phase === 'finished' ? (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverWinner}>
              {gameState.players.reduce((a, b) => a.score > b.score ? a : b).name} wins!
            </Text>
            <View style={styles.gameOverScores}>
              {gameState.players.map(p => (
                <Text key={p.id} style={styles.gameOverScore}>{p.name}: {p.score}</Text>
              ))}
            </View>
            <Pressable onPress={onReturnToMenu} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnText}>Back to Menu</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.footerContent}>
            <View style={styles.turnInfo}>
              <Text style={styles.turnPlayer}>
                {isAITurn
                  ? `${currentPlayer.name} is thinking...`
                  : isEmptyHandTurn
                  ? `${currentPlayer.name} has no tiles — skipping...`
                  : `${currentPlayer.name}'s turn`}
              </Text>
              {message && !isAITurn && (
                <Text style={styles.turnMessage}>{message}</Text>
              )}
            </View>

            {!isAITurn && !isEmptyHandTurn && (
              <View style={styles.controls}>
                <Hand
                  tiles={availableHand}
                  selectedTile={selectedTile}
                  onTileSelect={handleTileSelect}
                />
                <View style={styles.actions}>
                  <Pressable
                    onPress={handleSkip}
                    disabled={stagedMoves.length > 0}
                    style={[
                      styles.btn, styles.btnSecondary,
                      stagedMoves.length > 0 && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.btnGhostText}>Skip</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleConfirm}
                    disabled={!movePreview?.valid}
                    style={[
                      styles.btn, styles.btnPrimary,
                      !movePreview?.valid && styles.btnDisabled,
                    ]}
                  >
                    <Text style={styles.btnText}>
                      Confirm ({stagedMoves.length})
                    </Text>
                  </Pressable>
                  {movePreview && (
                    <Text style={[
                      styles.movePreview,
                      movePreview.valid ? styles.movePreviewValid : styles.movePreviewInvalid,
                    ]}>
                      {movePreview.valid ? `+${movePreview.score} pts` : movePreview.reason}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.navy,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.navyMid,
    gap: 10,
  },
  title: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  scores: {
    flex: 1,
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
    backgroundColor: colors.navyLight,
  },
  scoreCardActive: {
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.08 }],
  },
  playerName: {
    color: colors.creamDark,
    fontSize: 13,
  },
  playerNameActive: {
    color: colors.cream,
    fontWeight: '600',
  },
  aiBadge: {
    color: colors.creamDark,
    fontSize: 11,
  },
  playerScore: {
    color: colors.gold,
    fontWeight: 'bold',
    fontSize: 14,
  },
  scoreDelta: {
    color: colors.goldLight,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  tilesRemaining: {
    color: colors.creamDark,
    fontSize: 12,
  },
  tilesRemainingLow: {
    color: colors.gold,
  },
  quitConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quitLabel: {
    color: colors.cream,
    fontSize: 13,
  },
  boardContainer: {
    flex: 1,
  },
  footer: {
    backgroundColor: colors.navyMid,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  turnInfo: {
    minWidth: 100,
  },
  turnPlayer: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  turnMessage: {
    color: colors.tealLight,
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  movePreview: {
    fontSize: 13,
    fontWeight: '600',
  },
  movePreviewValid: {
    color: colors.tealLight,
  },
  movePreviewInvalid: {
    color: '#e07070',
  },
  gameOver: {
    alignItems: 'center',
    gap: 8,
  },
  gameOverTitle: {
    color: colors.gold,
    fontSize: 20,
    fontWeight: 'bold',
  },
  gameOverWinner: {
    color: colors.cream,
    fontSize: 16,
  },
  gameOverScores: {
    flexDirection: 'row',
    gap: 16,
  },
  gameOverScore: {
    color: colors.creamDark,
    fontSize: 13,
  },
  // Buttons
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  btnPrimary: {
    backgroundColor: colors.gold,
  },
  btnSecondary: {
    backgroundColor: colors.navyLight,
    borderWidth: 1,
    borderColor: colors.navyLight,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.navyLight,
  },
  btnDanger: {
    backgroundColor: '#9b2335',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: colors.navy,
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnGhostText: {
    color: colors.cream,
    fontSize: 13,
  },
})
