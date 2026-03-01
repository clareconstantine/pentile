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
      <div className="setup-card">
        <h1 className="setup-title">PENTILE</h1>
        <p className="setup-subtitle">A game of fives</p>

        <div className="setup-players">
          {slots.map((slot, i) => (
            <div
              key={i}
              className={`player-slot ${slot.active ? 'active' : 'inactive'}`}
            >
              <div className="slot-header">
                <span className="slot-number">P{i + 1}</span>
                {i >= 2 && (
                  <button
                    className="slot-toggle"
                    onClick={() => toggleSlot(i)}
                  >
                    {slot.active ? '−' : '+'}
                  </button>
                )}
              </div>

              {slot.active && (
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
              )}

              {!slot.active && (
                <div className="slot-empty" onClick={() => toggleSlot(i)}>
                  + Add Player
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="start-btn"
          onClick={handleStart}
          disabled={activePlayers.length < 1}
        >
          Start Game
        </button>
      </div>
    </div>
  )
}
