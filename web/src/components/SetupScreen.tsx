import { useState } from 'react'
import type { PlayerConfig } from './GameScreen'
import type { AIDifficulty } from '@engine/ai'
import '../styles/SetupScreen.css'

interface SetupScreenProps {
  onStart: (players: PlayerConfig[]) => void
}

type PlayerType = 'human' | 'easy' | 'medium'

interface PlayerSlot {
  name: string
  type: PlayerType
  active: boolean
}

const DEFAULTS: PlayerSlot[] = [
  { name: 'Player 1', type: 'human',  active: true  },
  { name: 'CPU',      type: 'medium', active: true  },
  { name: 'Player 3', type: 'human',  active: false },
  { name: 'Player 4', type: 'human',  active: false },
]

export default function SetupScreen({ onStart }: SetupScreenProps) {
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULTS)
  const [showDirections, setShowDirections] = useState(false)

  const activePlayers = slots.filter(s => s.active)

  const updateSlot = (index: number, update: Partial<PlayerSlot>) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, ...update } : s))
  }

  const toggleSlot = (index: number) => {
    const active = slots.filter(s => s.active)
    if (slots[index].active && active.length <= 2) return
    updateSlot(index, { active: !slots[index].active })
  }

  const handleStart = () => {
    const players: PlayerConfig[] = slots
      .filter(s => s.active)
      .map(s => ({
        name: s.name,
        isAI: s.type !== 'human',
        difficulty: s.type === 'human' ? undefined : s.type as AIDifficulty,
      }))
    onStart(players)
  }

  return (
    <div className="setup-screen">
      {showDirections && (
        <div className="directions-backdrop" onClick={() => setShowDirections(false)}>
          <div className="directions-modal" onClick={e => e.stopPropagation()}>
            <button className="directions-close" onClick={() => setShowDirections(false)}>✕</button>
            <h2 className="directions-title">How to Play</h2>

            <div className="directions-sections">
              <section className="directions-section">
                <h3>The board</h3>
                <p>13 × 17 grid. The first tile must cover the center square.</p>
              </section>

              <section className="directions-section">
                <h3>Your turn</h3>
                <p>Place 1–5 tiles in a straight line — all in the same row or all in the same column. At least one tile must touch a tile already on the board.</p>
              </section>

              <section className="directions-section">
                <h3>The rule</h3>
                <p>Every contiguous run of 2 or more tiles — horizontally and vertically — must sum to a multiple of 5. A run can never be longer than 5 tiles.</p>
              </section>

              <section className="directions-section">
                <h3>Scoring</h3>
                <p>Score the sum of every run your tiles touch, in both directions.</p>
              </section>

              <section className="directions-section">
                <h3>End of game</h3>
                <p>The game ends when all tiles have been played, or when no player can make a valid move. Subtract the sum of your remaining tiles from your score. Highest score wins.</p>
              </section>
            </div>
          </div>
        </div>
      )}

      <div className="setup-card">
        <h1 className="setup-title">PENTILE</h1>
        <p className="setup-subtitle">A game of fives</p>

        <div className="setup-players">
          {slots.map((slot, i) => (
            i >= 2 && !slot.active ? (
              <button key={i} className="add-player-btn" onClick={() => toggleSlot(i)}>
                + Add Player {i + 1}
              </button>
            ) : (
              <div key={i} className="player-slot">
                <div className="slot-header">
                  <span className="slot-number">P{i + 1}</span>
                  {i >= 2 && (
                    <button className="slot-toggle" onClick={() => toggleSlot(i)}>−</button>
                  )}
                </div>
                <div className="slot-body">
                  <input
                    className="slot-name"
                    value={slot.name}
                    onChange={e => updateSlot(i, { name: e.target.value })}
                    maxLength={16}
                  />
                  <div className="slot-type-picker">
                    {(['human', 'easy', 'medium'] as PlayerType[]).map(type => (
                      <button
                        key={type}
                        className={`type-btn ${slot.type === type ? 'selected' : ''}`}
                        onClick={() => updateSlot(i, { type })}
                      >
                        {type === 'human' ? 'Human' : type === 'easy' ? 'CPU Easy' : 'CPU Med'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        <button
          className="start-btn"
          onClick={handleStart}
          disabled={activePlayers.length < 1}
        >
          Start Game
        </button>
        <button className="how-to-play-btn" onClick={() => setShowDirections(true)}>
          How to play?
        </button>
      </div>
    </div>
  )
}
