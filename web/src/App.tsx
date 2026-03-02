import { useState, useEffect } from 'react'
import './index.css'
import SetupScreen from './components/SetupScreen'
import GameScreen from './components/GameScreen'
import type { PlayerConfig } from './components/GameScreen'

type Screen = 'setup' | 'game'
type Theme = 'dark' | 'light'

export default function App() {
  const [screen, setScreen] = useState<Screen>('setup')
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>([])
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('pentile-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pentile-theme', theme)
  }, [theme])

  const handleStart = (configs: PlayerConfig[]) => {
    setPlayerConfigs(configs)
    setScreen('game')
  }

  const handleReturnToMenu = () => {
    setScreen('setup')
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <>
      {screen === 'game' && playerConfigs.length > 0 ? (
        <GameScreen
          key={playerConfigs.map(p => p.name).join(',')}
          playerConfigs={playerConfigs}
          onReturnToMenu={handleReturnToMenu}
        />
      ) : (
        <SetupScreen onStart={handleStart} />
      )}
      <button className="theme-toggle" onClick={toggleTheme}>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>
    </>
  )
}
