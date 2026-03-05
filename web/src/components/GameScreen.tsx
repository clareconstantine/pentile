import { useState, useCallback, useEffect, useRef } from 'react'
import type { GameState, Tile, PlacedTile, Position } from '@engine/types'
import { createGame, takeTurn, skipTurn } from '@engine/gameState'
import { validatePartialMove, validateMove } from '@engine/validation'
import { getValidPlacementCells } from '@engine/board'
import { findBestMove } from '@engine/ai'
import type { AIDifficulty } from '@engine/ai'
import Board from './Board'
import Hand from './Hand'
import '../styles/GameScreen.css'

export interface PlayerConfig {
  name: string
  isAI: boolean
  difficulty?: AIDifficulty
}

interface GameScreenProps {
  playerConfigs: PlayerConfig[]
  onReturnToMenu: () => void
  isDark?: boolean
  onToggleTheme?: () => void
  learningMode?: boolean
  challengeMode?: boolean
  onToggleChallengeMode?: () => void
}

const AI_THINKING_DELAY_MS = 1200

export default function GameScreen({ playerConfigs, onReturnToMenu, isDark, onToggleTheme, learningMode, challengeMode, onToggleChallengeMode }: GameScreenProps) {
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
    const seen = localStorage.getItem('pentile-endgame-seen')
    if (!seen) {
      setShowEndgameModal(true)
      localStorage.setItem('pentile-endgame-seen', '1')
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
        : `+${result.scoreEarned} points for ${currentPlayer.name}!${pct}`
    )
  }, [gameState, stagedMoves, currentPlayer, multipleHumans, challengeMode, turnMaxScore])

  const handleDragStart = useCallback((tile: Tile) => {
    setSelectedTile(tile)
    setMessage('')
  }, [])

  const handleDragEnd = useCallback(() => {
    setSelectedTile(null)
  }, [])

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
    <div className="game-screen">
      <header className="game-header">
        <h1 className="game-title">PENTILE</h1>
        <div className="scores">
          {gameState.players.map((p, i) => (
            <div
              key={p.id}
              className={`score-card ${i === gameState.currentPlayerIndex && gameState.phase === 'playing' ? 'active' : ''}`}
            >
              <span className="player-name">
                {p.name}
                {playerConfigs[i].isAI && (
                  <span className="ai-badge">
                    {playerConfigs[i].difficulty ?? 'medium'}
                  </span>
                )}
              </span>
              <span className="player-score">
                {p.score}
                {scoreFlash?.playerIndex === i && (
                  <span key={p.score} className="score-delta">+{scoreFlash.amount}</span>
                )}
              </span>
            </div>
          ))}
        </div>
        <span className={`tiles-remaining ${gameState.tileBag.length <= 10 ? 'tiles-remaining--low' : ''}`}>
          {gameState.tileBag.length === 0 ? 'Bag empty' : `${gameState.tileBag.length} tile${gameState.tileBag.length === 1 ? '' : 's'} in bag`}
        </span>
        {menuState === 'confirming' ? (
          <div className="quit-confirm">
            <span className="quit-confirm-label">Quit game?</span>
            <button className="btn btn-danger" onClick={onReturnToMenu}>Quit</button>
            <button className="btn btn-ghost" onClick={() => setMenuState('closed')}>Cancel</button>
          </div>
        ) : menuState === 'menu' ? (
          <div className="quit-confirm">
            <button className="btn btn-ghost" onClick={onToggleTheme}>{isDark ? 'Light' : 'Dark'}</button>
            <button className={`btn btn-ghost ${challengeMode ? 'btn-ghost--active' : ''}`} onClick={onToggleChallengeMode}>Challenge</button>
            <button className="btn btn-danger" onClick={() => setMenuState('confirming')}>Quit</button>
            <button className="btn btn-ghost" onClick={() => setMenuState('closed')}>✕</button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setMenuState('menu')}>Menu</button>
        )}
      </header>

      {isEndgame && (
        <div className="endgame-banner">
          No more tiles to draw — players are finishing their hands
        </div>
      )}

      <main className="game-main">
        <Board
          board={gameState.board}
          stagedMoves={stagedMoves}
          selectedTile={selectedTile}
          validCells={validCells}
          recentMoves={recentMoves}
          onCellClick={handleCellClick}
          onStagedClick={handleUnstage}
          onCellDrop={handleCellClick}
        />
      </main>

      <footer className="game-footer">
        {handoffPending ? (
          <div className="handoff">
            <div className="handoff-info">
              {message && <span className="turn-message">{message}</span>}
              <span className="handoff-name">{currentPlayer.name}'s turn</span>
              <span className="handoff-hint">Pass the device, then tap Ready</span>
            </div>
            <button className="btn btn-primary" onClick={handleHandoffReady}>
              Ready →
            </button>
          </div>
        ) : gameState.phase === 'finished' ? (
          <div className="game-over">
            <div className="game-over-title">Game Over</div>
            <div className="game-over-winner">
              {gameState.players.reduce((a, b) => a.score > b.score ? a : b).name} wins!
            </div>
            <div className="game-over-scores">
              {gameState.players.map(p => {
                const penalty = p.hand.reduce((sum, t) => sum + t.value, 0)
                const rawScore = p.score + penalty
                return (
                  <span key={p.id}>
                    {p.name}: {penalty > 0 ? `${rawScore} − ${penalty} = ${p.score}` : `${p.score}`}
                  </span>
                )
              })}
            </div>
            <div className="game-over-actions">
              <button className="btn btn-primary" onClick={onReturnToMenu}>
                Back to Menu
              </button>
            </div>
          </div>
        ) : !isAITurn && !isEmptyHandTurn ? (
          <div className="footer-row">
            <div className="footer-left">
              <span className="turn-player">{currentPlayer.name}'s turn</span>
              {message && <span className="turn-message">{message}</span>}
              <Hand
                tiles={availableHand}
                selectedTile={selectedTile}
                onTileSelect={handleTileSelect}
                onTileDragStart={handleDragStart}
                onTileDragEnd={handleDragEnd}
              />
            </div>
            <div className="actions">
              {movePreview ? (
                <span className={`move-preview ${movePreview.valid ? 'move-preview--valid' : 'move-preview--invalid'}`}>
                  {movePreview.valid ? (
                    <>
                      +{movePreview.score} pts
                      {learningMode && turnMaxScore !== null && turnMaxScore > 0 && (
                        <span className={`learning-pct ${
                          movePreview.score >= turnMaxScore ? 'learning-pct--optimal' :
                          movePreview.score / turnMaxScore >= 0.7 ? 'learning-pct--good' :
                          'learning-pct--low'
                        }`}>
                          {Math.min(100, Math.round(movePreview.score / turnMaxScore * 100))}% of potential points
                        </span>
                      )}
                    </>
                  ) : movePreview.reason}
                </span>
              ) : hasValidMoves === false ? (
                <span className="move-preview move-preview--no-moves">No valid moves</span>
              ) : null}
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={!movePreview?.valid}
              >
                Confirm ({stagedMoves.length} tile{stagedMoves.length !== 1 ? 's' : ''})
              </button>
              <button
                className={`btn ${hasValidMoves === false && stagedMoves.length === 0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleSkip}
                disabled={stagedMoves.length > 0}
              >
                Skip Turn
              </button>
            </div>
          </div>
        ) : (
          <div className="turn-info">
            <span className="turn-player">
              {isAITurn ? (
                <span className="thinking-indicator">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  {currentPlayer.name} is thinking
                </span>
              ) : (
                <span className="thinking-indicator">
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  <span className="thinking-dot" />
                  {currentPlayer.name} has no tiles — skipping
                </span>
              )}
            </span>
          </div>
        )}
      </footer>

      {showEndgameModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">Endgame</div>
            <div className="modal-body">
              The bag is empty. Players continue playing from their hands, and when no one has any more moves, tiles remaining in your hand are subtracted from your score.
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowEndgameModal(false)}>Got It</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
