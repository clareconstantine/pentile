import { useState, useCallback } from 'react'
import type { GameState, Tile, PlacedTile, Position } from '@engine/types'
import { createGame } from '@engine/gameState'
import { takeTurn, skipTurn } from '@engine/gameState'
import { validatePartialMove } from '@engine/validation'
import Board from './Board'
import Hand from './Hand'
import './GameScreen.css'

export default function GameScreen() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createGame({ playerNames: ['Player 1', 'Player 2'] })
  )
  const [selectedTile, setSelectedTile] = useState<Tile | null>(null)
  const [stagedMoves, setStagedMoves] = useState<PlacedTile[]>([])
  const [message, setMessage] = useState<string>('')

  const currentPlayer = gameState.players[gameState.currentPlayerIndex]

  // Tiles currently in hand minus any already staged
  const stagedIds = new Set(stagedMoves.map(m => m.tile.id))
  const availableHand = currentPlayer.hand.filter(t => !stagedIds.has(t.id))

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

  // Only check structural validity mid-turn, not sum rules
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
    setMessage(result.state.phase === 'finished'
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

  const handleNewGame = useCallback(() => {
    setGameState(createGame({ playerNames: ['Player 1', 'Player 2'] }))
    setStagedMoves([])
    setSelectedTile(null)
    setMessage('')
  }, [])

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
              <span className="player-name">{p.name}</span>
              <span className="player-score">{p.score}</span>
            </div>
          ))}
        </div>
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
            <button className="btn btn-primary" onClick={handleNewGame}>New Game</button>
          </div>
        ) : (
          <>
            <div className="turn-info">
              <span className="turn-player">{currentPlayer.name}'s turn</span>
              {message && <span className="turn-message">{message}</span>}
            </div>
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
      </footer>
    </div>
  )
}
