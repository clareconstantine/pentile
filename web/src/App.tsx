import { useState, useEffect } from 'react'
import './index.css'
import SetupScreen, { type GameOptions } from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'

type Screen = 'setup' | 'game'
export type Theme = 'dark' | 'light' | 'auto'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])
  const [gameOptions, setGameOptions] = useState<GameOptions>({ learningMode: false })
  const [challengeMode, setChallengeMode] = useState(() =>
    localStorage.getItem('pentile-challenge') === 'true'
  )
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pentile-theme')
    if (saved === 'light' || saved === 'dark' || saved === 'auto') return saved
    return 'auto'
  })

  useEffect(() => {
    const resolved = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : theme
    document.documentElement.setAttribute('data-theme', resolved)
    localStorage.setItem('pentile-theme', theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const handler = () => {
      document.documentElement.setAttribute('data-theme', mq.matches ? 'light' : 'dark')
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const handleStart = (configs: PlayerConfig[], options: GameOptions) => {
    setPlayerConfigs(configs)
    setGameOptions(options)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  const toggleChallengeMode = () => setChallengeMode(c => {
    localStorage.setItem('pentile-challenge', String(!c))
    return !c
  })

  return (
    <>
      {screen === 'game' && playerConfigs.length > 0 ? (
        <GameScreen
          key={playerConfigs.map(p => p.name).join(',')}
          playerConfigs={playerConfigs}
          onReturnToMenu={handleReturnToMenu}
          theme={theme}
          onSetTheme={setTheme}
          learningMode={gameOptions.learningMode}
          challengeMode={challengeMode}
          onToggleChallengeMode={toggleChallengeMode}
        />
      ) : (
        <SetupScreen
          onStart={handleStart}
        />
      )}
    </>
  )
}
