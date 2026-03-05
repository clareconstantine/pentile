import { useState, useEffect } from 'react'
import './index.css'
import SetupScreen, { type GameOptions } from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'

type Screen = 'setup' | 'game'
type Theme = 'dark' | 'light'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])
  const [gameOptions, setGameOptions] = useState<GameOptions>({ learningMode: false })
  const [challengeMode, setChallengeMode] = useState(() =>
    localStorage.getItem('pentile-challenge') === 'true'
  )
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pentile-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pentile-theme', theme)
  }, [theme])

  const handleStart = (configs: PlayerConfig[], options: GameOptions) => {
    setPlayerConfigs(configs)
    setGameOptions(options)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

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
          isDark={theme === 'dark'}
          onToggleTheme={toggleTheme}
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
