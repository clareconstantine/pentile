import { useState, useCallback, useEffect, useRef } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
  learningMode?: boolean
  challengeMode?: boolean
  onToggleChallengeMode?: () => void
}

const AI_THINKING_DELAY_MS = 1200

// Persists across game sessions within the app lifecycle (no AsyncStorage needed)
let endgameModalShown = false

export default function GameScreen({ playerConfigs, onReturnToMenu, learningMode, challengeMode, onToggleChallengeMode }: GameScreenProps) {
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
  const [menuState, setMenuState] = useState<'closed' | 'menu' | 'confirming'>('closed')
  const [recentMoves, setRecentMoves] = useState<Set<string>>(new Set())
  const [handoffPending, setHandoffPending] = useState(false)
  const [turnMaxScore, setTurnMaxScore] = useState<number | null>(null)
  const [scoreFlash, setScoreFlash] = useState<{ playerIndex: number; amount: number } | null>(null)
  const [hasValidMoves, setHasValidMoves] = useState<boolean | null>(null)
  const [showEndgameModal, setShowEndgameModal] = useState(false)

  const aiThinking = useRef(false)
  const aiHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const emptyHandSkipping = useRef(false)
  const pendingHandoffMoves = useRef<Set<string>>(new Set())

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const currentConfig = playerConfigs[gameState.currentPlayerIndex]
  const isAITurn = currentPlayer.isAI && gameState.phase === 'playing'
  const isFirstMove = gameState.board.every((row) => row.every((cell) => cell === null))
  const isEmptyHandTurn = !isAITurn && gameState.phase === 'playing' && currentPlayer.hand.length === 0
  const multipleHumans = playerConfigs.filter(p => !p.isAI).length > 1
  const isEndgame = gameState.phase === 'playing' && gameState.tileBag.length === 0

  const stagedIds = new Set(stagedMoves.map(m => m.tile.id))
  const availableHand = currentPlayer.hand.filter(t => !stagedIds.has(t.id))
  const movePreview = stagedMoves.length > 0
    ? validateMove(gameState.board, stagedMoves, isFirstMove)
    : null
  const validCells = gameState.phase === 'playing' && !isAITurn && !handoffPending
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
            setRecentMoves(positions)
            setScoreFlash({ playerIndex: gameState.currentPlayerIndex, amount: result.scoreEarned })
            if (aiHighlightTimer.current) clearTimeout(aiHighlightTimer.current)
            aiHighlightTimer.current = setTimeout(() => {
              setRecentMoves(new Set())
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

  // ── Pass-the-device handoff ───────────────────────────────────────────

  useEffect(() => {
    if (!multipleHumans || gameState.phase !== 'playing' || gameState.turnNumber === 0) return
    const player = gameState.players[gameState.currentPlayerIndex]
    if (player.isAI || player.hand.length === 0) return
    setHandoffPending(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.currentPlayerIndex, gameState.phase])

  const handleHandoffReady = useCallback(() => {
    setHandoffPending(false)
    setMessage('')
    if (pendingHandoffMoves.current.size > 0) {
      setRecentMoves(pendingHandoffMoves.current)
      pendingHandoffMoves.current = new Set()
      if (aiHighlightTimer.current) clearTimeout(aiHighlightTimer.current)
      aiHighlightTimer.current = setTimeout(() => setRecentMoves(new Set()), 1500)
    }
  }, [])

  // ── Valid moves + learning mode: compute best possible score for this turn ──

  useEffect(() => {
    if (isAITurn || isEmptyHandTurn || gameState.phase !== 'playing') {
      setHasValidMoves(null)
      setTurnMaxScore(null)
      return
    }
    const best = findBestMove(gameState, 'medium')
    setHasValidMoves(best !== null)
    setTurnMaxScore((learningMode || challengeMode) ? (best?.score ?? 0) : null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningMode, challengeMode, gameState.currentPlayerIndex, gameState.phase])

  // ── Show endgame modal once (first time bag empties) ──────────────────

  useEffect(() => {
    if (!isEndgame) return
    if (!endgameModalShown) {
      endgameModalShown = true
      setShowEndgameModal(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEndgame])

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
    if (multipleHumans) {
      pendingHandoffMoves.current = new Set(stagedMoves.map(m => `${m.position.row},${m.position.col}`))
    }
    setGameState(result.state)
    setStagedMoves([])
    setSelectedTile(null)
    const pct = challengeMode && !learningMode && turnMaxScore !== null && turnMaxScore > 0
      ? ` · ${Math.min(100, Math.round(result.scoreEarned / turnMaxScore * 100))}% of potential`
      : ''
    setMessage(
      result.state.phase === 'finished'
        ? 'Game over!'
        : `You scored +${result.scoreEarned} points!${pct}`
    )
  }, [gameState, stagedMoves, currentPlayer, multipleHumans, challengeMode, turnMaxScore])

  const handleSkip = useCallback(() => {
    setStagedMoves([])
    setSelectedTile(null)
    const result = skipTurn(gameState)
    if (result.success) {
      setGameState(result.state)
      setMessage('You skipped your turn.')
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

        <Pressable onPress={() => setMenuState('menu')} style={[styles.btn, styles.btnGhost]}>
          <Text style={styles.btnGhostText}>Menu</Text>
        </Pressable>
      </View>

      {/* Endgame banner */}
      {isEndgame && (
        <View style={styles.endgameBanner}>
          <Text style={styles.endgameBannerText}>No more tiles to draw — players are finishing their hands</Text>
        </View>
      )}

      {/* Board */}
      <View style={styles.boardContainer}>
        <Board
          board={gameState.board}
          stagedMoves={stagedMoves}
          selectedTile={selectedTile}
          validCells={validCells}
          recentMoves={recentMoves}
          onCellClick={handleCellClick}
          onStagedClick={handleUnstage}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {handoffPending ? (
          <View style={styles.handoff}>
            <View style={styles.handoffInfo}>
              {message ? <Text style={styles.turnMessage}>{message}</Text> : null}
              <Text style={styles.handoffName}>{currentPlayer.name}'s turn</Text>
              <Text style={styles.handoffHint}>Pass the device, then tap Ready</Text>
            </View>
            <Pressable onPress={handleHandoffReady} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnText}>Ready →</Text>
            </Pressable>
          </View>
        ) : gameState.phase === 'finished' ? (
          <View style={styles.gameOver}>
            <Text style={styles.gameOverTitle}>Game Over</Text>
            <Text style={styles.gameOverWinner}>
              {(() => {
                const winner = gameState.players.reduce((a, b) => a.score > b.score ? a : b)
                const winnerConfig = playerConfigs[gameState.players.indexOf(winner)]
                return winnerConfig.isAI ? 'CPU wins!' : 'You win!'
              })()}
            </Text>
            <View style={styles.gameOverScores}>
              {gameState.players.map(p => {
                const penalty = p.hand.reduce((sum, t) => sum + t.value, 0)
                const rawScore = p.score + penalty
                return (
                  <Text key={p.id} style={styles.gameOverScore}>
                    {p.name}: {penalty > 0 ? `${rawScore} − ${penalty} = ${p.score}` : `${p.score}`}
                  </Text>
                )
              })}
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
                  ? 'CPU is thinking...'
                  : isEmptyHandTurn
                  ? 'You have no tiles — skipping...'
                  : 'Your turn'}
              </Text>
              {message && (
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
                      styles.btn,
                      hasValidMoves === false && stagedMoves.length === 0 ? styles.btnPrimary : styles.btnSecondary,
                      stagedMoves.length > 0 && styles.btnDisabled,
                    ]}
                  >
                    <Text style={hasValidMoves === false && stagedMoves.length === 0 ? styles.btnText : styles.btnGhostText}>Skip</Text>
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
                  {movePreview ? (
                    <View style={styles.movePreviewContainer}>
                      <Text style={[
                        styles.movePreview,
                        movePreview.valid ? styles.movePreviewValid : styles.movePreviewInvalid,
                      ]}>
                        {movePreview.valid ? `+${movePreview.score} pts` : movePreview.reason}
                      </Text>
                      {movePreview.valid && learningMode && turnMaxScore !== null && turnMaxScore > 0 && (
                        <Text style={[
                          styles.learningPct,
                          movePreview.score >= turnMaxScore ? styles.learningPctOptimal :
                          movePreview.score / turnMaxScore >= 0.7 ? styles.learningPctGood :
                          styles.learningPctLow,
                        ]}>
                          {Math.min(100, Math.round(movePreview.score / turnMaxScore * 100))}% of potential
                        </Text>
                      )}
                    </View>
                  ) : hasValidMoves === false ? (
                    <Text style={styles.noValidMoves}>No valid moves</Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Menu overlay */}
      <Pressable
        style={[styles.menuOverlay, menuState === 'closed' && { display: 'none' }]}
        onPress={() => setMenuState('closed')}
      >
        <View style={styles.menuModal}>
            <View style={styles.menuModalHeader}>
              <Text style={styles.menuModalTitle}>MENU</Text>
              <Pressable onPress={() => setMenuState('closed')} style={styles.menuCloseBtn}>
                <Text style={styles.menuCloseBtnText}>✕</Text>
              </Pressable>
            </View>
            {menuState === 'confirming' ? (
              <View style={styles.menuSection}>
                <Text style={styles.menuConfirmText}>Quit the current game?</Text>
                <View style={styles.menuActions}>
                  <Pressable onPress={onReturnToMenu} style={[styles.btn, styles.btnDanger]}>
                    <Text style={styles.btnText}>Quit</Text>
                  </Pressable>
                  <Pressable onPress={() => setMenuState('menu')} style={[styles.btn, styles.btnGhost]}>
                    <Text style={styles.btnGhostText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.menuSection}>
                  <Pressable onPress={onToggleChallengeMode} style={styles.menuToggleRow}>
                    <View style={[styles.menuCheckbox, challengeMode && styles.menuCheckboxChecked]}>
                      {challengeMode && <Text style={styles.menuCheckboxTick}>✓</Text>}
                    </View>
                    <Text style={styles.menuToggleLabel}>Show % of potential after each turn</Text>
                  </Pressable>
                </View>
                <View style={styles.menuSection}>
                  <Pressable onPress={() => setMenuState('confirming')} style={[styles.btn, styles.btnDanger, styles.menuQuitBtn]}>
                    <Text style={styles.btnText}>Quit Game</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
      </Pressable>

      {/* Endgame modal */}
      <Modal visible={showEndgameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Endgame</Text>
            <Text style={styles.modalBody}>
              The bag is empty. Players continue playing from their hands, and when no one has any more moves, tiles remaining in your hand are subtracted from your score.
            </Text>
            <Pressable onPress={() => setShowEndgameModal(false)} style={[styles.btn, styles.btnPrimary]}>
              <Text style={styles.btnText}>Got It</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  scoreCardActive: {
    backgroundColor: 'rgba(201,168,76,0.18)',
    borderWidth: 1,
    borderColor: colors.gold,
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
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(13,27,42,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  menuModal: {
    backgroundColor: colors.navyMid,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.navyLight,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  menuModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuModalTitle: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
  menuCloseBtn: {
    padding: 4,
  },
  menuCloseBtnText: {
    color: colors.creamDark,
    fontSize: 16,
  },
  menuSection: {
    marginBottom: 16,
  },
  menuToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.navyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCheckboxChecked: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  menuCheckboxTick: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: 'bold',
  },
  menuToggleLabel: {
    color: colors.cream,
    fontSize: 14,
    flex: 1,
  },
  menuConfirmText: {
    color: colors.cream,
    fontSize: 14,
    marginBottom: 16,
  },
  menuActions: {
    flexDirection: 'row',
    gap: 10,
  },
  menuQuitBtn: {
    alignSelf: 'flex-start',
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
  handoff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  handoffInfo: {
    flex: 1,
    gap: 2,
  },
  handoffName: {
    color: colors.cream,
    fontSize: 13,
    fontWeight: '600',
  },
  handoffHint: {
    color: colors.creamDark,
    fontSize: 12,
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
  movePreviewContainer: {
    gap: 2,
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
  learningPct: {
    fontSize: 11,
  },
  learningPctOptimal: {
    color: colors.goldLight,
  },
  learningPctGood: {
    color: colors.tealLight,
  },
  learningPctLow: {
    color: colors.creamDark,
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
  endgameBanner: {
    backgroundColor: 'rgba(44,180,180,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(44,180,180,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  endgameBannerText: {
    color: colors.tealLight,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  noValidMoves: {
    color: colors.creamDark,
    fontSize: 12,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: colors.navyMid,
    borderWidth: 1,
    borderColor: colors.navyLight,
    borderRadius: 8,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    gap: 16,
  },
  modalTitle: {
    color: colors.goldLight,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalBody: {
    color: colors.cream,
    fontSize: 13,
    lineHeight: 20,
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
  btnGhostActive: {
    borderColor: colors.teal,
    backgroundColor: 'rgba(44,180,180,0.15)',
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
