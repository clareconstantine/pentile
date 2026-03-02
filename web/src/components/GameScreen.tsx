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

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const currentConfig = playerConfigs[gameState.currentPlayerIndex]
  const isAITurn = currentPlayer.isAI && gameState.phase === 'playing'

  const stagedIds = new Set(stagedMoves.map(m => m.tile.id))
  const availableHand = currentPlayer.hand.filter(t => !stagedIds.has(t.id))
  const movePreview = stagedMoves.length > 0
    ? validateMove(gameState.board, stagedMoves, gameState.turnNumber === 0)
    : null
  const validCells = gameState.phase === 'playing' && !isAITurn
    ? getValidPlacementCells(gameState.board, stagedMoves, gameState.turnNumber === 0)
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
    const preview = validatePartialMove(gameState.board, newStaged, gameState.turnNumber === 0)
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
          {gameState.tileBag.length} tiles left
        </span>
        {confirmingQuit ? (
          <div className="quit-confirm">
            <span className="quit-confirm-label">Quit game?</span>
            <button className="btn btn-danger" onClick={onReturnToMenu}>Quit</button>
            <button className="btn btn-ghost" onClick={() => setConfirmingQuit(false)}>Cancel</button>
          </div>
        ) : (
          <button className="btn btn-ghost" onClick={() => setConfirmingQuit(true)}>Menu</button>
        )}
      </header>

      <main className="game-main">
        <Board
          board={gameState.board}
          stagedMoves={stagedMoves}
          selectedTile={selectedTile}
          validCells={validCells}
          recentMoves={aiRecentMoves}
          onCellClick={handleCellClick}
          onStagedClick={handleUnstage}
        />
      </main>

      <footer className="game-footer">
        {gameState.phase === 'finished' ? (
          <div className="game-over">
            <div className="game-over-title">Game Over</div>
            <div className="game-over-winner">
              {gameState.players.reduce((a, b) => a.score > b.score ? a : b).name} wins!
            </div>
            <div className="game-over-scores">
              {gameState.players.map(p => (
                <span key={p.id}>{p.name}: {p.score}</span>
              ))}
            </div>
            <div className="game-over-actions">
              <button className="btn btn-primary" onClick={onReturnToMenu}>
                Back to Menu
              </button>
            </div>
          </div>
        ) : (
          <>
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
                  `${currentPlayer.name}'s turn`
                )}
              </span>
              {message && !isAITurn && (
                <span className="turn-message">{message}</span>
              )}
            </div>

            {!isAITurn && (
              <>
                <Hand
                  tiles={availableHand}
                  selectedTile={selectedTile}
                  onTileSelect={handleTileSelect}
                />
                <div className="actions">
                  <button
                    className="btn btn-secondary"
                    onClick={handleSkip}
                    disabled={stagedMoves.length > 0}
                  >
                    Skip Turn
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleConfirm}
                    disabled={!movePreview?.valid}
                  >
                    Confirm ({stagedMoves.length} tile{stagedMoves.length !== 1 ? 's' : ''})
                  </button>
                  {movePreview && (
                    <span className={`move-preview ${movePreview.valid ? 'move-preview--valid' : 'move-preview--invalid'}`}>
                      {movePreview.valid ? `+${movePreview.score} pts` : movePreview.reason}
                    </span>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </footer>
    </div>
  )
}
