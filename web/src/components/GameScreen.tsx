import { useState, useCallback, useEffect } from 'react'
import type { GameState, Tile, PlacedTile, Position } from '@engine/types'
import { createGame, takeTurn, skipTurn } from '@engine/gameState'
import { validatePartialMove } from '@engine/validation'
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

const AI_THINKING_DELAY_MS = 750

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
  const [aiThinking, setAiThinking] = useState(false)

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]
  const currentConfig = playerConfigs[gameState.currentPlayerIndex]
  const isAITurn = currentPlayer.isAI && gameState.phase === 'playing'

  const stagedIds = new Set(stagedMoves.map(m => m.tile.id))
  const availableHand = currentPlayer.hand.filter(t => !stagedIds.has(t.id))

  // ── AI turn handler ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isAITurn || aiThinking) return

    setAiThinking(true)
    setMessage(`${currentPlayer.name} is thinking...`)

    const timer = setTimeout(() => {
      const difficulty = currentConfig.difficulty ?? 'medium'
      const move = findBestMove(gameState, difficulty)

      if (!move) {
        const result = skipTurn(gameState)
        if (result.success) {
          setGameState(result.state)
          setMessage(`${currentPlayer.name} had no valid move and skipped.`)
        }
      } else {
        const result = takeTurn(gameState, move.placed)
        if (result.success) {
          setGameState(result.state)
          setMessage(
            result.state.phase === 'finished'
              ? 'Game over!'
              : `${currentPlayer.name} scored +${result.scoreEarned}!`
          )
        }
      }

      setAiThinking(false)
    }, AI_THINKING_DELAY_MS)

    return () => clearTimeout(timer)
  }, [isAITurn, gameState, aiThinking, currentPlayer, currentConfig])

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
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost" onClick={onReturnToMenu}>Menu</button>
      </header>

      <main className="game-main">
        <Board
          board={gameState.board}
          stagedMoves={stagedMoves}
          selectedTile={selectedTile}
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
                    disabled={stagedMoves.length === 0}
                  >
                    Confirm ({stagedMoves.length} tile{stagedMoves.length !== 1 ? 's' : ''})
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </footer>
    </div>
  )
}
